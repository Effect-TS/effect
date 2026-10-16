---
"effect": patch
---

Add `JsonArray` to `effect/encoding`. Its decoders stream the elements of one JSON array, at the root or selected by a JSON Pointer, without buffering the whole document; its encoders write a stream of values as one JSON array.
