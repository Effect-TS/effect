---
"effect": patch
---

Allow `HttpApiSchema.StreamUint8Array` and `HttpApiSchema.StreamNdjson` to declare a list of content types. The first entry is the default response type, streaming payloads are accepted under every entry, and OpenAPI emits the stream under each one.
