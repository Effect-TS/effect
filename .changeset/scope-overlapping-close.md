---
"effect": patch
---

Make overlapping `Scope.close` calls wait for the finalizers of the close in progress, so a second `ManagedRuntime.dispose`, `ManagedRuntime.disposeEffect` or web handler `dispose` no longer completes before the resources are released. A close from a finalizer of the same scope, or from a fiber the close interrupts, still returns immediately.
