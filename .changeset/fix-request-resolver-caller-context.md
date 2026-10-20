---
"effect": patch
---

Run each `RequestResolver.fromEffect` entry with its own caller context, without falling back to another caller's services, while preserving services added by resolver wrappers. Preserve the batch creator's context when collection ends early, and document first-caller semantics for batch and SQL resolvers without splitting batches by whole caller contexts.
