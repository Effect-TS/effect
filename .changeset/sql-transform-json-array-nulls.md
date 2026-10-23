---
"effect": patch
---

Fix `transformResultNames` and `transformQueryNames` throwing on JSON arrays that contain `null`, and turning scalar items in those arrays into objects.
