# task-003 — Ladybird RDP caveat + quickstart alignment

## Objective
Bring the Ladybird portion of the main research doc in line with the dedicated research notes by acknowledging the published RDP guide and adding a concrete quickstart for connecting via Firefox DevTools.

## Evidence of the Gap
- `.specs/debug/research.md:220-223` claims there is no public remote-debug protocol documentation for Ladybird.
- `.specs/debug/research-ladybird.md:3-24` summarises the official `Documentation/DevTools.md`, including handshake details and logging guidance.
- `.specs/debug/research.md:187-195` lists a Servo quickstart but none for Ladybird despite similar protocol alignment.

## Definition of Done
- Section 5 “Caveats” no longer misrepresents Ladybird’s documentation; it references the published devtools guide instead.
- Section 3 quickstarts add a Ladybird entry that explains how to enable the devtools server (`--devtools=<port>`), connect from Firefox, and verify actor responses.
- Updates cite `Documentation/DevTools.md` excerpts reflected in the research file, maintaining Hard-Fail transparency (e.g., call out known instability from the doc).

## Suggested Steps
1. Quote relevant portions of `.specs/debug/research-ladybird.md` to reference the existing documentation.
2. Draft a quickstart command sequence (Ladybird launch + Firefox `about:debugging` connect) and, if possible, include a sample RDP request/response captured with `DEVTOOLS_DEBUG`.
3. Edit `.specs/debug/research.md` accordingly and reference the research file in footnotes.

## References
- `.specs/debug/research-ladybird.md`
- `.patterns/module-organization.md` (keep doc structure tidy)
