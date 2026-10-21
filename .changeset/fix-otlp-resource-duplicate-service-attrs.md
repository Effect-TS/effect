---
"@effect/opentelemetry": patch
---

Fix `OtlpResource.fromConfig` emitting duplicate `service.name` and `service.version` attributes when they are set in `OTEL_RESOURCE_ATTRIBUTES`.
