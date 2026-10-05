---
"effect": patch
---

Fix ManagedRuntime disposal deadlocking when called from a managed effect or its structured children, including immediately started children.
