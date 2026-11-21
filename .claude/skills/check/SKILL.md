---
name: check
description: Run the pre-push gate for Kachka (typecheck, unit tests, production build) and report what failed. Use before every push or PR, or when someone says "check", "verify", "is it green", "can I push".
---

# The gate before every push

Run these in order and stop at the first failure:

```bash
npm run check   # tsc --noEmit, then vitest run
npm run build   # vite build, then the server bundle
```

Then report:

- **Green:** say so in one line, with the number of tests that ran.
- **Red:** quote the first error with its file and line, say which step failed, and fix it if it is in the
  files this session owns. If it is in someone else's card, do not edit their files: tell the user who
  owns it (the board, or the `CARD n` comment at the top of the file).

Also check, because the build cannot:

- `git diff --stat` touches only the folder of the card being worked on, plus announced shared files.
- No secret is staged: `git diff --cached | grep -iE "sk-ant|api[_-]?key *=|token *=" ` returns nothing
  but placeholders.
- No UI copy contains a banned phrase from `CLAUDE.md` ("safe to drive", "sober", "BAC" and the rest).

Do not push or open a PR from this skill. It only answers "is it safe to push".
