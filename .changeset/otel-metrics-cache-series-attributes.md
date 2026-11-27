---
"@effect/opentelemetry": patch
---

Reduce collection allocations by caching each series' key and reusing frozen attributes where possible.
