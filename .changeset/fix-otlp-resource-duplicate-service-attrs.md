---
"@effect/opentelemetry": patch
---

Fix `OtlpResource.fromConfig` duplicating `service.name`/`service.version` attributes when they are provided via `OTEL_RESOURCE_ATTRIBUTES`. These keys are now filtered out of the attributes record before being passed to `make`, which already adds them explicitly.
