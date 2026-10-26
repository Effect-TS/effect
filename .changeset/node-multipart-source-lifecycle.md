---
"@effect/platform-node": patch
---

Fix `NodeMultipart.stream` hanging on a request body that closed early or before parsing, and keeping a listener on the body after parsing finished.
