---
"effect": patch
---

Fix persisted `Entity.keepAlive(true)` requests completing prematurely on redelivery, preserving entity recovery after runner restarts.
