---
"effect": patch
---

Derive workflow execution IDs from a length-prefixed workflow tag and idempotency key. Previously derived IDs change, so new `execute` calls will not deduplicate against existing executions. Before upgrading a persistent engine, account for in-flight executions and retain their original IDs for polling, resumption, interruption, and durable tokens; stored executions and tokens are not migrated automatically.
