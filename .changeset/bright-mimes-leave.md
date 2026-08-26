---
"@effect/platform-node": patch
---

Remove the `mime` runtime dependency. The `Mime` module now provides top-level lookup functions backed by a vendored
standard MIME registry.
