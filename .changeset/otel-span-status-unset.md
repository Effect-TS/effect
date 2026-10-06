---
"effect": patch
"@effect/opentelemetry": patch
---

Leave interrupt-only spans `Unset` without a status description and replace `span.label` and `status.interrupted` with `effect.fiber.interrupted: true`. Successful and empty-cause spans retain `Ok`; failures retain `Error` status and exception events. Omit OTLP `exception.stacktrace` when no stack exists. Consumers using the old interruption attributes or filtering interrupted spans by `Ok` should update their queries.
