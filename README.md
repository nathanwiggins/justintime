# Just-In-Time

A lightweight, client-side NSF budget justification generator built for research administrators and hosted on GitHub Pages. Upload a grant budget spreadsheet and a project summary document, and receive a formatted Word document ready to submit.

## Features

- **Budget Verifier** — a dedicated Verifier tab accepts any budget justification `.docx` and its corresponding spreadsheet. AI passes identify every dollar value in the justification, match each against the spreadsheet, and group the discrepancies by root cause. When discrepancies exist, a full-screen chat modal walks the user through each finding one at a time, asking whether it's a real problem or a non-issue, before rendering a simplified color-coded summary — real issues shown prominently, non-issues collapsed. A button downloads a marked-up copy of the original document with mismatched values highlighted in red and unmatched values in yellow.
- **Live document and spreadsheet preview during review** — the chat modal shows the source files side-by-side with the conversation, toggled with a Document/Spreadsheet switch. The document view (`js/doc-preview.js`, `.docx` only) reuses `Highlighter`'s value/context matching; the spreadsheet view (`js/sheet-preview.js`) renders each workbook tab as an HTML table (via SheetJS's `sheet_to_html`) with its own tab switcher, matching flagged values against cell contents with numeric tolerance. Every flagged figure is subtly marked throughout whichever view is open; the figure(s) tied to whichever finding is currently being discussed are highlighted more prominently. Moving to a new finding in the chat auto-scrolls to it in the document view, and — if the Spreadsheet view is open — auto-switches to whichever sheet holds that finding's value; manually switching views or sheets never gets overridden by this auto-follow. `.pdf` justification uploads show a "preview isn't available" message instead, since only `.docx` can be rendered this way today.
- **Verifier-first UI** — opens directly on the Verifier tab. The Generator tab is temporarily hidden from navigation; Settings are a click away but stay out of the way during normal use.
- **"How It Works" explainer** — a floating help button (bottom-right, visible on every tab) opens a click-through, 5-step animated walkthrough of the Verifier pipeline (upload/extraction, labeling, matching, auditing, and human-in-the-loop review), aimed at non-technical users. It illustrates "structured output" — the JSON schema that forces each AI response into a predictable shape — with a real simplified example. Built on a reusable step-flow engine (`js/step-flow.js`) intended to also drive a future live progress animation during an actual verification run.
- **Drag-and-drop file uploads** — budget file and project summary both support drag-and-drop or click-to-browse. Accepted formats shown inline; filename displayed on selection.
- **Project summary as document or text** — upload a `.doc` or `.docx` file (default) or toggle to a plain text input. Mammoth.js extracts text from the uploaded document before generation begins.
- **Default profile** — mark any Institutional Profile as the default in Settings. It auto-selects in the Generator dropdown on every load.
- **Section-by-section AI generation** — the Gemini API is called once per document section. Each call uses a focused, section-specific prompt from `sections.js`, improving narrative quality and making individual sections easy to tune.
- **Section registry** — `js/sections.js` defines the ordered section list for each template. Each entry holds a label, the fields it produces, a focused prompt, and its schema fragment. This is the single place to add, remove, or refine any section's behavior.
- **Institutional context injection** — fringe and F&A boilerplate from the selected profile are passed to the AI as context for Sections C and I respectively, so the model incorporates the institution's specific rates and language into the narrative.
- **Template Mode** — a toggle above the Generate button runs the full AI pipeline but replaces all narrative fields with `[Justification required]` placeholders post-generation, producing a pre-populated template with all numbers and structure intact for manual narrative completion.
- **Step-by-step progress log** — each step displays live with a category icon and a spinner that resolves to a checkmark or error indicator, alongside an elapsed timer. On the Verifier tab this log is always visible as the pipeline runs — friendly labels and timing for everyone, with an expandable "Details" toggle per step for advanced users who want to see the exact prompt sent and the raw API response. If a step is still running after 60 seconds, its Details pane auto-expands to show the model's response streaming in live (direct Gemini calls stream natively; Vandalizer-hosted runs will do the same once that proxy's `/generate` endpoint adds streaming support — until then they show a "still working" placeholder with no regression from prior behavior).
- **Word document output** — the final payload builds a `.docx` file from scratch using the `docx` library. No pre-built template files required. The document downloads automatically.
- **Last updated indicator** — a footer shows the date of the most recent push, fetched live from the GitHub API.
- **API key data-privacy warning** — a persistent notice on the Settings tab's API Configuration card, and a pop-up shown each time an API key is saved, reminds users that a standard (free-tier) API key isn't covered by an enterprise data-processing agreement, that prompts and data may be logged or used to train models, to review the data-sharing terms of any API key before use, and to never enter sensitive or confidential information.

## Tech Stack

| Concern | Library |
|---|---|
| Spreadsheet parsing | [SheetJS](https://sheetjs.com/) |
| Word document parsing | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) |
| AI narrative generation | [Gemini API](https://ai.google.dev/) (structured JSON output) |
| Word document generation | [docx](https://github.com/dolanmiu/docx) (built programmatically) |
| Settings & review-chat persistence | Browser `localStorage` |

## File Structure

```
justintime/
├── index.html              # SPA shell
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Boot, tab routing
│   ├── settings.js         # Settings tab + localStorage CRUD
│   ├── generator.js        # Generator workflow orchestration
│   ├── parser.js           # SheetJS parsing + source-of-truth extraction
│   ├── api.js              # Universal API adapter: Gemini direct (standalone) or Vandalizer proxy (DGX-hosted)
│   ├── schemas.js          # Full JSON schemas per template type + VerifierSchemas
│   ├── sections.js         # Section registry: ordered section definitions per template
│   ├── verifier.js         # Portable two-step verification core: Verifier.run(text, csv, key)
│   ├── verifier-tab.js     # Verifier tab UI: file handling, orchestration, results rendering
│   ├── verifier-chat.js    # Chat-driven findings review: walks the user through each finding, tags real issues vs. non-issues, persists/resumes via localStorage
│   ├── highlighter.js      # DOCX markup: injects <w:highlight> into flagged runs via JSZip
│   ├── doc-preview.js      # Live in-browser justification preview: renders + highlights flagged values during chat review
│   ├── sheet-preview.js    # Live in-browser spreadsheet preview: per-sheet tables via SheetJS, cell-value highlighting
│   └── document.js         # docx output + download trigger
└── templates/
    └── nsf.txt             # Reference: NSF section layout and field definitions
```

## Getting Started: Obtaining a Gemini API Key

> **DGX / Vandalizer deployments:** When Just-In-Time is hosted on a Vandalizer server, all AI calls are routed through the `/api/apps/generate` proxy automatically. No Gemini API key is required.

Just-In-Time uses the Gemini API for AI generation when running standalone. A free API key is available through Google AI Studio — no billing required for standard use.

### Get Your Key

1. **Visit Google AI Studio** — go to [aistudio.google.com](https://aistudio.google.com/) in your browser.
2. **Sign in** — use any free Google (`@gmail.com`) or Google Workspace account.
3. **Open the API Key panel** — click the **Get API key** button in the top-left sidebar.
4. **Generate a key:**
   - Click **Create API key**.
   - Choose an existing Google Cloud project, or let AI Studio create a default **My Project** container automatically.
5. **Copy the key** — click the copy icon next to the generated string.

> **Security note:** Treat this key like a password. Never commit it to a public repository.

### Configure the Key in Just-In-Time

**Option A — UI Settings (recommended):**

1. Launch the app and click the **Settings** tab.
2. Paste your key into the **Gemini API Key** field.
3. Click **Save API Key**.

The key is stored in your browser's `localStorage` and never leaves your device.

**Option B — Environment variable (for local backend use):**

Create a `.env` file in the project root and add:

```
GEMINI_API_KEY=your_actual_api_key_here
```

---

## Local Development

No build step required. Open `index.html` directly in a browser, or serve the directory with any static file server:

```bash
npx serve .
```

## Deployment

Push to the `main` branch. GitHub Pages serves `index.html` from the repository root automatically.

## Usage

### Generating a budget justification

1. Go to the **Settings** tab.
2. Enter and save your Gemini API key.
3. Create at least one Institutional Profile with your institution's fringe benefit and F&A boilerplate text. Optionally mark one as the default.
4. Go to the **Generator** tab. It's currently hidden from the nav bar (Verifier is the default tab); re-enable it in `index.html` to use the Generator.
5. Select an Institutional Profile, upload your budget file, and upload your project summary document (or toggle to text input).
6. Click **Generate Justification** — a `.docx` file will download automatically.

### Verifying a budget justification

1. Go to the **Verifier** tab.
2. Upload a budget justification `.docx` file.
3. Upload the corresponding budget spreadsheet (`.csv`, `.xls`, or `.xlsx`).
4. Click **Verify Budget**.

Before any AI calls are made, the justification document is scanned for dollar values; if none are found, an error asks you to upload a valid budget justification document.

Just-In-Time makes several AI passes: the first labels every dollar amount in the justification; the second matches each against the spreadsheet; a third audits not-found values with a fresh match attempt; a fourth groups mismatches by root cause (consolidated to roughly four groups); and a final pass writes a short, neutral, plain-language explanation for each group — naming the specific conflicting figures so the discrepancy is concrete, but with no judgment or corrective language yet.

If any findings remain, a chat modal opens and walks through each finding one at a time. Not-found items (titled "Hard to Find Items" on the summary card) are informational only: the assistant lists what it had trouble finding and suggests double-checking anything that looks important, with a single "Got it" acknowledgement to move on — no judgment call required, and they default to the dismissed/collapsed state in the final summary. Mismatch groups open with the assistant describing the neutral, suspected discrepancy and asking the user to confirm or correct it in a resizable, multi-line message box (Shift+Enter for a newline, Enter to send), or the user can click "Ignore Issue" to skip it immediately without discussion. The user replies in plain text, with the budget justification and spreadsheet — and a summary of any findings already resolved earlier in the same review, so the assistant understands references back to them — passed along as context so the assistant can check the user's explanation against the source documents rather than take it at face value. The conversation defaults to closing and marking the finding a real issue after any reply; it only keeps going if the user asks a genuine question or offers clarifying context, and only closes as "not a concern" if the user's reply states or implies it isn't actually a problem — the user drives whether the conversation continues, not the assistant. On close, the assistant writes a standalone, professionally worded resolution summary — distinct from its conversational chat reply, and phrased around what the documents show rather than referencing "the user" — that states the issue, the relevant context, and the fix or next step, folding in anything learned during the conversation rather than just repeating the original finding. This resolution fully replaces the original neutral finding text in the final summary rather than appearing alongside it, avoiding a redundant one-line-then-paragraph repeat. Progress is saved to `localStorage` as you go, so closing the tab or reloading the page mid-review surfaces a "Continue Review" or "View Summary" prompt (once both files are re-selected) that picks up where you left off. Once every finding is resolved, the full per-finding conversation log is also recorded as its own step in the progress log above (labeled "Reviewing findings," with a "Details" toggle per finding), alongside the other AI-pass steps. A simplified summary then renders: real mismatches as color-coded cards (yellow for values missing from the spreadsheet, red for mismatches) with the resolution text shown up front and the itemized dollar-value diffs collapsed behind a "See details" toggle, and dismissed/hard-to-find/ignored items collapsed under a "Reviewed — no action needed" toggle. A marked-up copy of the justification document can be downloaded with problem values highlighted.

When running on a DGX/Vandalizer deployment, the Labeling and Matching steps are automatically split into batches of 25 items each and processed sequentially. Each batch appears as its own step in the progress log with its own expandable debug view. Results are concatenated before the next stage begins. Direct Gemini API runs use a single call for typical documents, but automatically switch to the same batching behavior — in batches of 50 items — once a document has more than 50 dollar values, to avoid truncated responses on very large documents.
