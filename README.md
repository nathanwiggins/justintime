# Just-In-Time

A lightweight, client-side budget justification verifier for research administrators. No backend, no build step — hosted on GitHub Pages.

## Features

- Upload a budget justification (`.docx`) and its spreadsheet (`.csv`/`.xls`/`.xlsx`) to catch mismatches before you submit.
- AI labels every dollar value, matches it against the spreadsheet, and groups discrepancies by root cause.
- A guided chat walks you through each finding — confirm it, explain it away, or click "Ignore Issue" to skip it.
- The justification and spreadsheet are shown side-by-side with the chat, with flagged values highlighted and auto-tracked as you go.
- Ends with a plain-language summary and a downloadable marked-up copy of the justification with flagged values highlighted.
- Drag-and-drop uploads, a live step-by-step progress log with expandable debug details per step, and a "How It Works" walkthrough for first-time users.
- API keys are stored only in your browser's `localStorage` — a warning reminds you to check your key's data-sharing terms before use.

## Tech Stack

| Concern | Library |
|---|---|
| Spreadsheet parsing | [SheetJS](https://sheetjs.com/) |
| Word document parsing | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) |
| AI generation | [Gemini API](https://ai.google.dev/) (structured JSON output) |
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
│   ├── verifier-chat.js    # Chat-driven findings review, persists/resumes via localStorage
│   ├── highlighter.js      # DOCX markup: injects <w:highlight> into flagged runs via JSZip
│   ├── doc-preview.js      # Live in-browser justification preview
│   ├── sheet-preview.js    # Live in-browser spreadsheet preview
│   └── document.js         # docx output + download trigger
└── templates/
    └── nsf.txt             # Reference: NSF section layout and field definitions
```

## Getting Started: Obtaining a Gemini API Key

> **DGX / Vandalizer deployments:** AI calls route through the `/api/apps/generate` proxy automatically. No Gemini API key needed.

Just-In-Time uses the Gemini API when running standalone. A free key is available through Google AI Studio — no billing required for standard use.

**Get a key:**
1. Go to [aistudio.google.com](https://aistudio.google.com/) and sign in with any Google account.
2. Click **Get API key** in the sidebar, then **Create API key**.
3. Copy the generated string.

> **Security note:** Treat this key like a password. Never commit it to a public repository.

**Configure it in Just-In-Time:**
- **UI (recommended):** Settings tab → paste into **Gemini API Key** → **Save API Key**. Stored in `localStorage`, never leaves your device.
- **Environment variable** (local backend use): add `GEMINI_API_KEY=your_actual_api_key_here` to a `.env` file in the project root.

## Local Development

No build step. Open `index.html` directly, or serve the directory:

```bash
npx serve .
```

## Deployment

Push to `main` — GitHub Pages serves `index.html` from the repository root automatically.

## Usage

### Verifying a budget justification
1. Go to the **Verifier** tab.
2. Upload a budget justification `.docx` and its spreadsheet.
3. Click **Verify Budget**.
4. Work through the chat that opens for each flagged finding — confirm, dismiss, or ignore it.
5. Review the summary and download the marked-up document.

Behind the scenes: values are labeled, matched against the spreadsheet, audited, and grouped by root cause before the chat opens. On DGX/Vandalizer deployments, large documents are processed in batches of 25 automatically; direct Gemini API calls batch at 50+ values to avoid truncation on very large documents.
