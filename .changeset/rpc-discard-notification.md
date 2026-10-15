---
"effect": minor
---

Calls made with `discard: true` now complete when the server acknowledges them, instead of when the request is written.

SchemaBinary peers must be upgraded together because the new `discard` field changes the envelope fingerprint.
