---
"effect": patch
---

Fix `SqlModel.makeRepository` `update` on SQL Server, which emitted `returning *` instead of `OUTPUT INSERTED.*`.
