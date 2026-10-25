---
"@effect/opentelemetry": patch
---

Fix `Resource.layerFromEnv` to percent-decode `OTEL_RESOURCE_ATTRIBUTES` keys and values, leaving values that are not valid percent-encoding unchanged.
