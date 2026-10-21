---
"effect": patch
---

Fix a Sharding startup race that could access singleton synchronization before initialization, causing a ReferenceError and delaying shutdown.
