---
"effect": patch
---

Fix lost durable deferred wake-ups when a ClusterWorkflowEngine execution suspends before its run reply is persisted. Deferred completions now wait for the current run reply before resuming, so discarded executions can replay without relying on caller retries.
