---
"effect": patch
---

Fix `Effect.timeoutOrElse` to stop the source and complete its interruption cleanup before invoking the fallback factory or running the fallback effect. Once the timeout is selected, the original source can no longer win while a slow fallback is running. The fallback factory remains lazy.

Compatibility: the fallback now executes in the caller continuation rather than the timer child. `Effect.forkChild` inside the fallback follows the caller's supervision and lifetime, and the fallback inherits the caller's ambient interruptibility. Code relying on the timer child's lifetime or interruptibility should choose an explicit child lifetime or interruption boundary instead. The provided `Scope` identity and Scope-owned cleanup remain unchanged.
