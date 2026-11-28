---
"effect": patch
---

Fix `Ndjson.decode` corrupting a line split across reads when the upstream reuses its Node.js `Buffer` between reads.
