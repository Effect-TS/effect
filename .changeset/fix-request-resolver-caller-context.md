---
"effect": patch
---

Run each `RequestResolver.fromEffect` entry with its own caller context, without inheriting another caller's services. Services provided around `runAll` must now be provided inside the entry function instead; entry spans retain their caller's parent rather than the `withSpan` resolver span. Preserve the batch creator's context when collection ends early, and document first-caller semantics for batch and SQL resolvers without splitting batches by whole caller contexts.
