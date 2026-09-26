---
"effect": patch
---

Forked scopes detach from their parent on close, even if cleanup throws or is interrupted, without a bookkeeping finalizer. The readonly `Scope.parent` field exposes the parent scope.
