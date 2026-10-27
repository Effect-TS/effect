---
"@effect/opentelemetry": patch
---

Percent-decode `OTEL_RESOURCE_ATTRIBUTES` keys and values in `Resource.layerFromEnv`, discarding the variable with a warning when its encoding is invalid. Thanks to @Marve10s for the original fix.

`Resource.layerFromEnv` now reads the variable with `Config.Record`, so it also accepts a structured config value for `OTEL_RESOURCE_ATTRIBUTES`.
