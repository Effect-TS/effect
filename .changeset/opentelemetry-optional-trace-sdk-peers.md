---
"@effect/opentelemetry": patch
---

Fix importing `@effect/opentelemetry` when the optional `@opentelemetry/sdk-trace-node` or `@opentelemetry/sdk-trace-web` peers are not installed. `NodeSdk` and `WebSdk` are no longer re-exported from the package root; import them from `@effect/opentelemetry/NodeSdk` and `@effect/opentelemetry/WebSdk`.
