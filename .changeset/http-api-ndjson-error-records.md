---
"effect": patch
---

Add an `error` schema to `HttpApiSchema.StreamNdjson` responses, so a typed failure is written as the final record and the derived client fails the stream with it.
