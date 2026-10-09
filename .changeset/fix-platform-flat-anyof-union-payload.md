---
"@effect/platform": patch
---

`OpenApi.fromApi` now emits a flat `anyOf` array when multiple union members in `setPayload` share the same content type. Previously, each additional member was wrapped in a new `Union` node, producing deeply nested `anyOf: [ anyOf: [A, B], C ]` structures. The fix uses `HttpApiSchema.UnionUnifyAST` — already used by the response-map accumulator — to flatten unions as they are collected.
