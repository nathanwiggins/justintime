---
name: Bug Report
title: "[Bug] frontend build fails: tsc errors in SupportCenter.tsx / TeamsDropdown.tsx"
labels: bug
---

## Description

`main` currently fails to build the frontend. `tsc -b` (run as part of `npm run build`) errors out in `SupportCenter.tsx` and `TeamsDropdown.tsx` because the `/support` route's `validateSearch` return type and the `navigate({ search: ... })` calls in those two files disagree on which search keys are required vs. optional.

This reproduces on a clean checkout of `main` with no local modifications, so it isn't specific to any downstream fork/deployment — it blocks `docker compose build` (and presumably CI) for anyone building from `main` right now.

## Steps to Reproduce

1. `git clone https://github.com/ui-insight/vandalizer.git && cd vandalizer/frontend`
2. `npm ci`
3. `npm run build`
4. See `tsc` errors below

## Expected Behavior

`npm run build` completes successfully.

## Actual Behavior

```
src/components/layout/TeamsDropdown.tsx(225,17): error TS2322: Type '{ ticket: undefined; }' is not assignable to type '{ ticket: string | undefined; status: "all" | "open" | "in_progress" | "closed" | undefined; priority: "normal" | "all" | "low" | "high" | undefined; classification: "all" | "bug" | "enhancement" | "feature_request" | undefined; tag: string | undefined; q: string | undefined; } | ParamsReducerFn<...>'.
  Type '{ ticket: undefined; }' is missing the following properties from type '{ ticket: string | undefined; status: ...; priority: ...; classification: ...; tag: ...; q: ... }': status, priority, classification, tag, q

src/pages/SupportCenter.tsx(107,7): error TS2322: ...
src/pages/SupportCenter.tsx(231,32): error TS2322: ...
src/pages/SupportCenter.tsx(237,32): error TS2322: ...
```

(Full output trimmed — same shape at all four sites: a partial search-params object/updater is rejected because the inferred search type requires all six keys.)

## Root Cause

Introduced in `84ab42d9` ("fix(support): keep queue filters in the URL so they survive a refresh"). In `frontend/src/router.tsx`, the `/support` route's `validateSearch` always returns all six keys, even when a value is `undefined`:

```ts
validateSearch: (search: Record<string, unknown>) => {
  const oneOf = ...
  return {
    ticket: (search.ticket as string) || undefined,
    status: oneOf(search.status, [...]),
    priority: oneOf(search.priority, [...]),
    classification: oneOf(search.classification, [...]),
    tag: (typeof search.tag === 'string' && search.tag) || undefined,
    q: (typeof search.q === 'string' && search.q) || undefined,
  }
},
```

Because every key is unconditionally present in the returned object, TanStack Router infers the search schema as **six required keys** (each allowed to *hold* `undefined`, but the key itself must be present on any object assigned to `search`). `TeamsDropdown.tsx` and `SupportCenter.tsx` call `navigate({ search: {...} })` with **partial** objects (e.g. `{ ticket: undefined }`, or a functional updater returning only the keys that changed), which only satisfies an "optional keys" schema — hence the mismatch.

## Suggested Fix

Have `validateSearch` omit a key entirely when its value is `undefined`, instead of setting the key to `undefined`. This makes the inferred type use optional keys (matching how the call sites already build their partial search objects) with no change in runtime/URL behavior, since TanStack Router already drops `undefined`-valued keys when serializing to the URL:

```ts
validateSearch: (search: Record<string, unknown>) => {
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined
  const ticket = (search.ticket as string) || undefined
  const status = oneOf(search.status, ['all', 'open', 'in_progress', 'closed'] as const)
  const priority = oneOf(search.priority, ['all', 'low', 'normal', 'high'] as const)
  const classification = oneOf(search.classification, ['all', 'bug', 'enhancement', 'feature_request'] as const)
  const tag = (typeof search.tag === 'string' && search.tag) || undefined
  const q = (typeof search.q === 'string' && search.q) || undefined
  return {
    ...(ticket !== undefined && { ticket }),
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(classification !== undefined && { classification }),
    ...(tag !== undefined && { tag }),
    ...(q !== undefined && { q }),
  }
},
```

I've verified this locally: applying it to a clean checkout of `main` and running `npx tsc -b` in `frontend/` exits 0 with no errors, and the three affected call sites in `TeamsDropdown.tsx`/`SupportCenter.tsx` need no changes.

## Environment

- **Vandalizer version/commit**: `main` (reproduces at least as of `f22f06c` through the current tip; first broke at `84ab42d9`)
- **Build**: `docker compose build` / `npm run build` (`tsc -b && vite build`) in `frontend/`
- **Node**: 24 (per `frontend/Dockerfile`, `node:24-alpine`)

## Additional Context

Happy to open a PR with the `validateSearch` change above if that's preferred over a maintainer picking it up directly.
