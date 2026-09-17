---
"effect": patch
---

Add `Scope.isOpen` and `Scope.isClosed` to inspect a scope's lifetime synchronously. Empty scopes are open, and scopes become closed as soon as closure starts, even while finalizers are still running.
