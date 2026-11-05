---
"effect": patch
---

Add `Entity.KeepAliveHandler`, which lets a cluster runtime react when an entity's `Entity.keepAlive` hold starts and ends, and `DurableClock.InMemoryThreshold`, which lets a workflow engine change the default duration up to which `DurableClock.sleep` waits in memory instead of scheduling a durable clock.
