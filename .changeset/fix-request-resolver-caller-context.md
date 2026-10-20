---
"effect": patch
---

Run each `RequestResolver.fromEffect` entry with its own caller context, without falling back to another caller's services, while preserving explicit resolver-wrapper overrides even when they equal the batch creator's values. Preserve the batch creator's context when collection ends early, and document first-caller semantics for batch and SQL resolvers without splitting batches by whole caller contexts.
