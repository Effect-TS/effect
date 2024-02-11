---
"effect": patch
---

removed unneccesary `isBun` check in `./internal/timeout`

previously bun had an issue with `setTimeout`, that caused incorrect behavior
that bug has since been fixed, and the `isBun` check is no longer needed
