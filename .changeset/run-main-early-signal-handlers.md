---
"effect": patch
---

Fix `runMain` skipping finalizers when `SIGINT` or `SIGTERM` arrives during synchronous startup.
