---
"@effect/opentelemetry": patch
---

Fix `OTEL_RESOURCE_ATTRIBUTES` parsing to keep values that contain `=`, and skip entries with an empty key.
