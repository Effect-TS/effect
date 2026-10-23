---
"effect": patch
---

Fix `transformResultNames` and `transformQueryNames` failing on JSON arrays that contain `null`, and turning scalar items in those arrays into objects.
