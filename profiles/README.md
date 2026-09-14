# Local Institutional Profiles

This folder is only read on local/on-prem (Vandalizer) deployments — GitHub Pages and standalone use never fetch it. It's empty by default; whoever manages a given deployment adds a `profiles.json` file here (and redeploys) to give every user on that installation a shared, read-only default Institutional Profile.

## Format

`profiles.json` — an array of objects:

```json
[
  {
    "name": "On-Campus",
    "fringeBoilerplate": "...",
    "faBoilerplate": "..."
  }
]
```

Same fields as a profile created in the app's Settings tab, minus `id` (assigned automatically on load).

## Behavior

- The app fetches `profiles/profiles.json` only when it detects it's running on a Vandalizer/DGX deployment.
- Profiles from this file appear in Settings tagged "Local Default" and can be viewed but not edited, renamed, or deleted from the app — change them by editing `profiles.json` and redeploying.
- The first profile in the array is automatically used as the default profile for every user on that deployment, overriding any personal default saved in a user's browser.
- If this file is missing or empty, nothing changes from today's behavior.
