---
"effect": patch
---

Interrupt a `Cache` lookup when its only caller is interrupted while the lookup is starting. Previously the lookup kept running and stayed cached, so later `Cache.get` calls for that key could wait forever.
