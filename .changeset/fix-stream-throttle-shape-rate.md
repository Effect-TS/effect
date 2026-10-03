---
"effect": patch
---

Fix accumulated rate drift in `Stream.throttle` with the `"shape"` strategy by retaining token debt after early wake-ups. Use monotonic time so wall clock changes do not affect throttling.
