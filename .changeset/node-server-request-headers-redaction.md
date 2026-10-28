---
"@effect/platform-node": patch
---

Convert Node HTTP server request headers to `Headers` instead of casting them, so configured header redaction applies when request headers are logged or inspected.
