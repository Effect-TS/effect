---
"@effect/opentelemetry": patch
---

Percent-decode `OTEL_RESOURCE_ATTRIBUTES` keys and values in `Resource.layerFromEnv`, discarding the variable with a warning when its encoding is invalid.
