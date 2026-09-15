(1) UI Design Strategy:
    - Projects view and normal interface should not be visible concurrently. (Needs Attention: All views are visible concurrently. They are stacked on top of one another vertically. This is NOT the interface I want. I want only one interface visible at a time)
    - Settings tab should be in project view, not the normal interface. (In Review)
    - The normal interface will ultimately not feature a separate "Generator" and "Verifier" tab. The two features will be interwoven. The user can generate a budget justification based on a budget spreadsheet and project document, or they can just upload a budget justification themselves. Our generation workflow generates a budget justification from a budget spreadsheet and project document. The verifier audits the budget justification against the budget spreadsheet. (In Review))

(2) Global Institutional Profile
    - If local Vandalizer mode is detected, there should be the option for the user to upload a folder into a new directory in this project: 'profiles'. Profiles in this folder are accessible by anyone using the app on that local infrastructure. (Addressed, scoped down per discussion: a static `profiles/profiles.json` shipped with the deployment — not an in-app upload UI — read only when Vandalizer is detected; see profiles/README.md.)
    - Local universal profiles are automatically set to the default profile on all users' apps. They can be viewed in settings, but not edited from there. (Addressed: the first profile in profiles.json becomes everyone's default automatically, shown read-only in Settings with no edit/delete/set-default controls.)

(3) Generator Check Figure
    - Currently the user enters this manually. Let's switch to having that value be extracted by AI will two independent calls. The results have to match, otherwise the process repeats until two match. (Addressed, with an agreed cap: retries up to 5 rounds of two-calls-must-match, then falls back to the manual entry field rather than looping forever.)

(4) Interactive Budget Justification View Adjustments
    - Including the technical JSON address (senior_personnel[0].yearly_breakdown[0].cost — $12,000 (linked)) on linked cells is just going to confuse the user. This should instead say: "[LINKED] Year 1 | B3" (sheet name, cell reference) (Addressed.)
    - Including the technical JSON address (indirect_costs.total_cost — $28,656 (calculated)) on calculated cells is also going to confuse the user. The should instead say: "[CALCULATED] 2 Values" (Addressed.)
    - Clicking off a calculated or linked value should clear the view. (Addressed.)
    - When editing a calculated value, clicking on other values to add them should cause them to be highlighted too, not remain faded. Same with clicking on active values to remove them - they should then fade. (Addressed.)
    -Even though the budget justification is technically in sections, the user should be able to edit anything in the document. (Addressed: every block — headings, labels, prose — is now free text, not just the narrative sentences.)
    -Add the ability to view the project documentation, if uploaded, somehow. (Addressed: new "Project Docs" tab next to the spreadsheet pane in the editor; the uploaded project summary is now also persisted with the project so there's something to show.)

(5) Validation Screen (raised mid-conversation, not originally in this file)
    - The screen where the user decides to keep a generation or try a new one doesn't need to state the total values for comparison — the text summary already there is sufficient. (Addressed: removed the "Your Total Budget" / "Calculated from this draft" figure lines, kept only the pass/fail message.)
