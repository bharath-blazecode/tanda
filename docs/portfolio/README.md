# Kachka portfolio handoff

Prepared 22 November 2026, Australia/Brisbane, for the next Astra Ultra development session.

## Start here

1. Read the [research and delivery brief](RESEARCH-BRIEF.md).
2. Attach the repository to the Astra session and paste the complete [implementation prompt](ASTRA-ULTRA-PROMPT.md).
3. Give Astra the supporting files below, or have it read this directory directly.
4. Ask it to verify the current branch, research access and pending pulse patch before implementing anything.

The [formatted PDF](exports/Kachka-Astra-Ultra-Handoff.pdf) contains the brief, the full copyable prompt and a source-status index. The Markdown files are the editable source of truth. The longer audit and evidence memos remain companion documents rather than duplicated PDF appendices.

## Contents

| File | Purpose |
|---|---|
| [ASTRA-ULTRA-PROMPT.md](ASTRA-ULTRA-PROMPT.md) | The complete self-contained request for discovery, implementation, testing and PR delivery |
| [RESEARCH-BRIEF.md](RESEARCH-BRIEF.md) | Product direction, evidence limits, dose examples and prioritized delivery |
| [CURRENT-STATE.md](CURRENT-STATE.md) | Source-based inventory of flows, design, privacy, accessibility and current gaps |
| [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md) | Threat-model questions, existing controls, deployment unknowns and future social prerequisites |
| [EVIDENCE-MATRIX.md](research/EVIDENCE-MATRIX.md) | Claim, evidence, limitations, safer wording and validation needed |
| [SOURCES.json](research/SOURCES.json) | Scientific leads and retrieved technical sources with explicit access status |
| [AUSTRALIAN-DRINK-EXAMPLES.csv](research/AUSTRALIAN-DRINK-EXAMPLES.csv) | Reproducible hypothetical volume/ABV arithmetic, not brand data |
| [RESEARCH-ACCESS.md](research/RESEARCH-ACCESS.md) | What could be accessed and what remains blocked or unverified |

## Revision boundary

The inspected main revision is `b3d93a6`. This handoff branch adds planning and research artifacts, not new application features.

The previously requested pulse fix is separate at `5ca2b58`, on `fix/pulse-stability-and-retry`. It passed `npm run check` with 513 tests across 42 files and `npm run build`. It was not merged by this work, and the checks do not establish medical accuracy. Astra should inspect the branch and determine its current merge status before reworking pulse.

## Research and release limits

Official OWASP and MDN technical sources were retrieved through their official GitHub repositories. Direct health and journal requests were blocked by the environment proxy. No primary physiological paper or official health-guidance text was freshly verified in this pass. Source entries distinguish successful retrieval, blocked access and repository citations that were not retrieved.

Targeted research and GitHub API domains were saved as an environment configuration draft. Review and save those additions in environment settings to enable the affected operations where supported. The saved draft is not a runtime change or a publication. Publishing an environment is a separate action owned by its editor.

The historical venue Wi-Fi password remains in Git history, although absent from current documents. Confirm it is retired or rotated before exposing that history. This documentation work does not rewrite history, change repository visibility, deploy the site, perform an active security test or certify compliance.

## What this prompt asks Astra to deliver

The prompt preserves the existing instrument theme, animations, naming and team attribution. It asks for clearer baseline/demo flows, a connected caffeine and serving model, evidence-aware pulse/motion work, security/privacy foundations, accessible motion and optional 3D, and social functionality only after its authorization and deletion requirements are ready.

Astra must report actual features, changes, preserved behavior, animations, research, security controls, migrations, tests and remaining limitations. It must finish with a reviewable PR or draft PR and leave merging to the owner. The prompt explicitly forbids invented readings, fabricated evidence, misleading clinical claims and claims of a PR that was never opened.

The writing uses plain English and avoids em dashes and unnecessary semicolons. Accurate references to AI functionality and research provenance remain. The pack does not claim a particular authorship based on punctuation or guarantee an AI-detector outcome.
