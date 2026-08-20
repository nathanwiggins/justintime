import json
import logging
import re
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.activity import ActivityStatus, ActivityType
from app.models.system_config import SystemConfig
from app.models.user import User
from app.models.workflow import Workflow, WorkflowResult
from app.rate_limit import limiter
from app.services import activity_service
from app.services.config_service import get_user_model_name
from app.services.llm_service import create_chat_agent
from app.services.metering import metered_async

logger = logging.getLogger(__name__)
router = APIRouter()

# Generic on purpose — every side-loaded app sharing this connector (Just-In-Time
# today, possibly others later) shows up as runs of the same one workflow rather
# than a per-app breakdown.
APP_CONNECTOR_WORKFLOW_NAME = "App Connector"


async def _get_or_create_app_connector_workflow(user: User, team_id: Optional[str]) -> Workflow:
    workflow = await Workflow.find_one(
        Workflow.user_id == user.user_id,
        Workflow.name == APP_CONNECTOR_WORKFLOW_NAME,
    )
    if workflow:
        return workflow
    workflow = Workflow(
        name=APP_CONNECTOR_WORKFLOW_NAME,
        description="Generate calls made through the /api/apps/generate connector by side-loaded apps.",
        user_id=user.user_id,
        team_id=team_id,
    )
    await workflow.insert()
    return workflow


class AppGenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    schema_def: Optional[Dict[str, Any]] = None
    model: Optional[str] = None


def _extract_json(output_text: str) -> Dict[str, Any]:
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", output_text, re.DOTALL)
    if match:
        output_text = match.group(1)
    else:
        start_dict = output_text.find("{")
        end_dict = output_text.rfind("}")
        start_list = output_text.find("[")
        end_list = output_text.rfind("]")
        if start_dict != -1 and end_dict != -1 and (
            start_list == -1 or start_dict < start_list
        ):
            output_text = output_text[start_dict:end_dict + 1]
        elif start_list != -1 and end_list != -1:
            output_text = output_text[start_list:end_list + 1]
    return json.loads(output_text.strip())


@router.post("/generate")
@limiter.limit("30/minute")
async def app_generate(
    request: Request,
    body: AppGenerateRequest,
    user: User = Depends(get_current_user),
):
    """Universal LLM connector for side-loaded applications."""
    model_name = body.model or await get_user_model_name(user.user_id)
    cfg = await SystemConfig.get_config()
    sys_config_doc = cfg.model_dump() if cfg else {}

    sys_prompt = body.system_prompt or "You are a helpful assistant."
    if body.schema_def:
        sys_prompt += (
            "\n\nCRITICAL INSTRUCTION: You must output ONLY valid, "
            "raw JSON that strictly conforms to this JSON Schema:\n"
            f"{json.dumps(body.schema_def)}\n"
            "Do not include Markdown formatting. "
            "Do not use ```json wrappers. "
            "Do not include any conversational text before or after "
            "the JSON."
        )

    agent = create_chat_agent(
        model_name,
        system_prompt=sys_prompt,
        thinking_override=False,
        system_config_doc=sys_config_doc,
    )

    team_id = (
        str(user.current_team) if getattr(user, "current_team", None) else None
    )

    workflow = await _get_or_create_app_connector_workflow(user, team_id)
    workflow_result = WorkflowResult(
        workflow=workflow.id,
        session_id=uuid4().hex,
        model=model_name,
        trigger_type="app_connector",
    )
    await workflow_result.insert()

    activity = await activity_service.activity_start(
        type=ActivityType.WORKFLOW_RUN,
        title="App Connector Call",
        user_id=user.user_id,
        team_id=team_id,
        workflow=workflow.id,
        workflow_result=workflow_result.id,
        steps_total=1,
    )

    async def _fail(detail_error: str) -> None:
        workflow_result.status = "failed"
        workflow_result.error = detail_error[:2000]
        await workflow_result.save()
        await activity_service.activity_finish(activity.id, ActivityStatus.FAILED, error=detail_error)

    try:
        async with metered_async(
            "app_connector_generate", user_id=user.user_id, team_id=team_id,
            activity_id=str(activity.id),
        ):
            result = await agent.run(body.prompt)
        full_text = result.output
    except Exception as e:
        logger.exception("App Connector Error")
        await _fail(str(e))
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

    async def _complete() -> None:
        workflow_result.status = "completed"
        workflow_result.num_steps_total = 1
        workflow_result.num_steps_completed = 1
        await workflow_result.save()
        await activity_service.activity_finish(activity.id, ActivityStatus.COMPLETED)
        workflow.num_executions += 1
        await workflow.save()

    if body.schema_def:
        try:
            parsed_json = _extract_json(full_text)
        except json.JSONDecodeError:
            logger.error("App Connector JSON Parse Error. Cleaned output: %s", full_text)
            await _fail("Model did not return valid JSON")
            raise HTTPException(status_code=502, detail="The model failed to return valid JSON.")
        await _complete()
        return {"data": parsed_json, "format": "json"}

    await _complete()
    return {"data": full_text.strip(), "format": "text"}
