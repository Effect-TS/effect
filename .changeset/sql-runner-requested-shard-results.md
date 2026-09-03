---
"effect": patch
---

Fix PostgreSQL advisory-lock `SqlRunnerStorage.acquire` and nonempty `refresh` results to include only requested shards, rather than also returning previously held shards outside the request. Unrequested shards remain locked until released.
