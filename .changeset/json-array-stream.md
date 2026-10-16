---
"effect": patch
---

Add `JsonArray` to `effect/encoding` for streaming one large JSON document. Its decoders emit the elements of the root array, or of an array selected by a JSON Pointer such as `"/data"`, as they arrive, without buffering the whole document; its encoders write a stream of values as one JSON array.
