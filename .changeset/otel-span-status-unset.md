---
"effect": patch
"@effect/opentelemetry": patch
---

Leave successful, interrupt-only, and empty-cause spans `Unset` without a status description, following OpenTelemetry guidance. Failures retain `Error` status and exception events. Replace the interruption attributes `span.label` and `status.interrupted` with `effect.fiber.interrupted: true`, and omit OTLP `exception.stacktrace` when no stack exists. Consumers filtering on `Ok` or using the old interruption attributes should update their queries.
