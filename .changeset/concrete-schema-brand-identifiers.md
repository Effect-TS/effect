---
"effect": patch
---

Restrict `Schema.brand` to a single concrete identifier and require `Schema.fromBrand` to use the constructor's sole brand key. Apply `brand` or `fromBrand` repeatedly when composing distinct brands. For enum brand keys, pass the enum member instead of its string value.
