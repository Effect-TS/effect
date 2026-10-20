---
"effect": patch
---

Provide each `RequestResolver.fromEffect` entry with its caller context, and preserve the batch creator's context when collection ends early. Document first-caller context semantics for batch and SQL resolvers without splitting batches by whole caller contexts.
