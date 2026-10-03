---
"effect": patch
---

Fix `Stream.throttle` with the `"shape"` strategy letting elements through faster than the configured rate. It now measures time with the monotonic clock, so wall clock changes no longer affect it.
