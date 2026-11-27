---
"effect": patch
---

Fix `SqlMessageStorage` storing replies that arrive after `deleteProcessed` removed their request, which retention never deleted.
