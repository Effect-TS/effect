---
"effect": patch
---

Fix ManagedRuntime disposal deadlocking when called from a managed effect after an async boundary.
