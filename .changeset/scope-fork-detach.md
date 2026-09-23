---
"effect": patch
---

Forked scopes now link to their parent directly instead of registering a finalizer to detach themselves. A child detaches as soon as it closes, even when one of its finalizers throws or the close is interrupted. Scopes expose the scope they were forked from through the readonly `Scope.parent` field.
