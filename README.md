# Just-In-Time

A lightweight, client-side NSF budget justification generator built for research administrators and hosted on GitHub Pages. Upload a grant budget spreadsheet and a project summary document, and receive a formatted Word document ready to submit.

## Features

- **Generator-first UI** — opens directly on the Generator tab. Settings are a click away but stay out of the way during normal use.
- **Drag-and-drop file uploads** — budget file and project summary both support drag-and-drop or click-to-browse. Accepted formats shown inline; filename displayed on selection.
- **Project summary as document or text** — upload a `.doc` or `.docx` file (default) or toggle to a plain text input. Mammoth.js extracts text from the uploaded document before generation begins.
- **Default profile** — mark any Institutional Profile as the default in Settings. It auto-selects in the Generator dropdown on every load.
- **Section-by-section AI generation** — the Gemini API is called once per document section. Each call uses a focused, section-specific prompt from `sections.js`, improving narrative quality and making individual sections easy to tune.
- **Section registry** — `js/sections.js` defines the ordered section list for each template. Each entry holds a label, the fields it produces, a focused prompt, and its schema fragment. This is the single place to add, remove, or refine any section's behavior.
- **Institutional context injection** — fringe and F&A boilerplate from the selected profile are passed to the AI as context for Sections C and I respectively, so the model incorporates the institution's specific rates and language into the narrative.
- **Template Mode** — a toggle above the Generate button runs the full AI pipeline but replaces all narrative fields with `[Justification required]` placeholders post-generation, producing a pre-populated template with all numbers and structure intact for manual narrative completion.
- **Step-by-step progress log** — each section displays live with a spinner that resolves to a checkmark or error indicator. Expandable detail panes show the exact prompt sent and the raw API response for every section.
- **Word document output** — the final payload builds a `.docx` file from scratch using the `docx` library. No pre-built template files required. The document downloads automatically.
- **Last updated indicator** — a footer shows the date of the most recent push, fetched live from the GitHub API.

## Tech Stack

| Concern | Library |
|---|---|
| Spreadsheet parsing | [SheetJS](https://sheetjs.com/) |
| Word document parsing | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) |
| AI narrative generation | [Gemini API](https://ai.google.dev/) (structured JSON output) |
| Word document generation | [docx](https://github.com/dolanmiu/docx) (built programmatically) |
| Settings persistence | Browser `localStorage` |

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
│   ├── api.js              # Gemini API communication (generate, generateSection, test)
│   ├── schemas.js          # Full JSON schemas per template type
│   ├── sections.js         # Section registry: ordered section definitions per template
│   ├── validator.js        # Amount mismatch detection
│   └── document.js         # docx output + download trigger
└── templates/
    └── nsf.txt             # Reference: NSF section layout and field definitions
```

## Getting Started: Obtaining a Gemini API Key

Just-In-Time uses the Gemini API for AI generation. A free API key is available through Google AI Studio — no billing required for standard use.

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

1. Go to the **Settings** tab.
2. Enter and save your Gemini API key.
3. Create at least one Institutional Profile with your institution's fringe benefit and F&A boilerplate text. Optionally mark one as the default.
4. Return to the **Generator** tab (opens by default).
5. Select an Institutional Profile, upload your budget file, and upload your project summary document (or toggle to text input).
6. Click **Generate Justification** — a `.docx` file will download automatically.
