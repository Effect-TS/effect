---
"effect": patch
---

Fix `Model.FieldOption` throwing when a field explicitly uses `undefined` to omit a variant. Omitted variants now remain omitted while defined variants retain their optional encoding behavior.
