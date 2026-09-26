---
"effect": patch
---

Run `Scope.close` finalizers uninterruptibly so interruption cannot abandon remaining cleanup, including when closing a `ManagedRuntime`.
