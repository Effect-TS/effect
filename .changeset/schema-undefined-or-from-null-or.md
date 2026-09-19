---
"effect": patch
---

Add `Schema.UndefinedOrFromNullOr` and `SchemaTransformation.undefinedOrFromNullOr`, the `T | undefined` counterpart of `Schema.OptionFromNullOr`: decoding maps `null` to `undefined`, encoding maps `undefined` back to `null`. Use it when a program models absence as `undefined` but the wire (JSON) must carry `null`, so the codec lives in the payload schema rather than at every call site.
