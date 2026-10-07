---
"effect": patch
"@effect/opentelemetry": patch
---

Allow spans without an Effect parent to inherit active OpenTelemetry spans created outside Effect. `root: true` still starts a new trace, and Effect-installed ambient spans are not inherited; use `Effect.withParentSpan` to pass an Effect parent explicitly.

Ignore invalid OpenTelemetry parents and skip disabled spans when propagating Effect context to OpenTelemetry.
