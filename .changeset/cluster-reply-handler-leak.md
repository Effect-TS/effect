---
"effect": patch
---

Fix a memory leak in cluster `MessageStorage.registerReplyHandler` when interrupted reply waiters leave stale request entries behind.
