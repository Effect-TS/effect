---
"effect": minor
---

Ensure scopes are preserved by stream / sink / channel operations

**NOTE**: This change does modify the public signature of several `Stream` / `Sink` / `Channel` methods. Namely, certain run methods that previously removed a `Scope` from the environment will no longer do so. This was a bug with the previous implementation of how scopes were propagated, and is why this change is being made in a minor release.
