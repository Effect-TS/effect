---
"effect": patch
---

Avoid mailbox starvation when an unrelated durable deferred completes during an active cluster workflow run. Complete that request without waiting for the run's reply, while preserving suspension-boundary wake recovery for deferreds the run has awaited.
