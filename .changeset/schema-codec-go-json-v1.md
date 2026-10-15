---
"effect": patch
---

Add `Schema.toCodecGoJsonV1`, a JSON codec that also decodes the `null` values Go's `encoding/json` writes for nil pointers, slices, and maps. A `null` optional key decodes as missing, and a `null` array or record decodes as empty. Encoding never produces `null` for these fields.
