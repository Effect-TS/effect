---
"effect": patch
---

removed `./internal/timeout` and replaced all usages with `setTimeout` directly

previously it was required to abstract away conditionally solving an bun had an issue with `setTimeout`, that caused incorrect behavior
that bug has since been fixed, and the `isBun` check is no longer needed
as such the timeout module is also no longer needed
