---
"@effect/platform-node": patch
---

Ignore a leading UTF-8 BOM when decoding Node HTTP request and response text, so `json` no longer fails on BOM-prefixed bodies.
