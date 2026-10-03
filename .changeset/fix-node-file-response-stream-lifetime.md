---
"@effect/platform-node": patch
---

Create Node HTTP file response streams lazily and destroy them when body consumption ends, avoiding unused open streams when conditional or range handling discards a response.
