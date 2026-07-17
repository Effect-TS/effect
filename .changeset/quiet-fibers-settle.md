---
"effect": patch
---

Fix corruption of the fiber continuation stack when a fiber is interrupted synchronously while already mid-`runLoop` on the same call stack (e.g. `Fiber.runIn` against an already-closed `Scope`, from inside the fiber's own execution).

Previously `interruptUnsafe` re-entered `evaluate`/`runLoop` recursively, running interrupt finalizers in the middle of the op that triggered the interrupt: an async `onInterrupt` finalizer would start before the triggering op had returned and everything past its first async boundary was silently dropped, while `Fiber.await` resolved as if finalization had completed.

The interrupt is now recorded and delivered by the active run loop itself, before any continuation frame of the triggering op is consumed - preserving the existing interruption semantics (an interruptible acquisition is still aborted without running its release; an uninterruptible one still registers its finalizer) while finalizers now run exactly once, in order, and `Fiber.await` only resolves after they complete.
