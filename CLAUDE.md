# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Agent Instructions for Just-In-Time

Welcome! You are an AI agent assisting with **Just-In-Time**, a lightweight, budget justification generator built on GitHub Pages.

Before starting work on new requests, always perform a `git pull` to ensure that the local codebase is up to date.

When contributing to this repository, every time you make a change that affects the user interface, feature set, backend code, workflow, or API, you **MUST** update `README.md`. Keep it concise and scannable like a typical open-source project README, not a narrative changelog:

- Use short bullets (one line each) grouped under clear headings — not multi-sentence prose paragraphs.
- Describe user-facing behavior only. Leave out implementation details (exact timings, retry counts, internal function/class/CSS names) — those belong in commit messages, not README.md.
- If an existing bullet or section is already the right place for a change, tighten or replace it rather than appending another clause.

Do not include code comments. This codebase should be free of all code comments.

After implementing a new feature, do not start up virtual environments to test features. The user will test features for visual correctness manually.