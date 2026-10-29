---
"effect": patch
---

Fix JSON Schema exports of `oneOf` unions that rejected values the codec accepts. A JSON Schema export describes only the last encoding of a codec, so when a transformation on the way can reject encoded values (such as `Schema.Date`, `Schema.URL`, `Schema.DateFromString` or `Schema.NumberFromString`), drops checks of its decoded side, or uses a decoding default that fails or does not decode, the exported schema accepts more than the codec. Such encodings are now approximate, and a `oneOf` union containing one exports as `anyOf`. Built-in codecs that decode every encoded value, such as `Schema.Class`, `Schema.Option`, `Schema.ReadonlyMap`, `Schema.ReadonlySet` and decoding defaults with a valid `Effect.succeed` value, keep `oneOf`.

`SchemaRepresentation.toRepresentation` and `toRepresentations` record this on the encoded side with a `"~approximateJson": true` annotation, so `SchemaRepresentation.toJsonSchemaDocument` gives the same result as `Schema.toJsonSchemaDocument`.
