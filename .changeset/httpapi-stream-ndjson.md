---
"effect": patch
---

Add `HttpApiSchema.StreamNdjson(schema, options?)` for newline-delimited JSON stream responses. Handlers return a `Stream` that is written one JSON line per value, and the derived client decodes each line through the schema. The content type defaults to `application/x-ndjson` and is configurable, and typed stream failures travel as a reserved final line, matching `StreamSse`.
