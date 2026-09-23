---
"effect": patch
---

Keep the failure an `onExit` finalizer was cleaning up after when the finalizer throws, so outer `onInterrupt` finalizers still run. Applies to `onExit`, `onError`, `onInterrupt`, their filtered forms, and `acquireUseRelease`'s release.
