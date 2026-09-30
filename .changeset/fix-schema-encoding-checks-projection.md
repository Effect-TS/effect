---
"effect": patch
---

Fix `Schema.toType` and `Schema.toEncoded` losing parent checks when projecting checked children without transformations. Suspended children remain opaque, and structural checks continue to be preserved.
