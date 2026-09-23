---
"effect": patch
---

Fix lost wake-ups in `Queue` when a fiber yields between checking for a message or capacity and registering its waiter.
