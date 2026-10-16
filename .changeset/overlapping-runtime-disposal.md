---
"effect": patch
---

Make overlapping `ManagedRuntime.dispose` and `ManagedRuntime.disposeEffect` calls wait for the disposal in progress, and make the `dispose` function returned by `HttpEffect.toWebHandlerLayerWith` (and `HttpRouter.toWebHandler`) return the same promise on every call. Effects run by the runtime and its finalizers still return immediately when they dispose it.
