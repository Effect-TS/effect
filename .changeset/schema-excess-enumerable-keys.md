---
"effect": patch
---

Schema: `onExcessProperty: "error"` now considers only enumerable own properties, so non-enumerable runtime internals such as `Error#stack` (or Bun's `line`, `column`, and related keys) no longer fail decoding and encoding. Schema-backed error classes, including `Schema.TaggedError`, are encodable again under strict options, and `HttpApi.ParseOptions` no longer turns error responses into 500s. `Record` and `StructWithRest` no longer reject values whose string keys are all covered by an index signature. Symbol index signatures also skip non-enumerable symbol keys, which are no longer decoded into the output.
