---
"effect": patch
---

Add `Schema.optionalKeyFromNullOr`, an exact optional struct field that also decodes `null` as a missing key. The `Type` has no `| null`, and encoding never produces `null`.
