---
"effect": patch
---

Fix `Effect.track(metric, mapper)` to reject source errors the mapper cannot handle.
Affected callers must broaden the mapper's error type, narrow the source errors, or
constrain a generic wrapper's error parameter. Runtime behavior is unchanged.
