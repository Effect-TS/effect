---
"effect": patch
---

`SqlMessageStorage.saveReply` no longer stores a reply for a request that `deleteProcessed` already removed. Such a reply referenced no request, so retention never deleted it.
