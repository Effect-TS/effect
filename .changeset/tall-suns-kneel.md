---
"@effect/rpc": patch
---

Fix `sendRequestDefect` and `sendDefect` to encode defects with `Schema.Defect`, preventing `Error` objects from being serialized as `{}` due to non-enumerable properties.
