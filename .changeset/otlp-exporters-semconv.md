---
"effect": patch
"@effect/opentelemetry": patch
---

Align OTLP and `@effect/opentelemetry` logs, traces, and resources with OpenTelemetry conventions. Use the release version in exporter User-Agent headers, SDK resource defaults, and `effect` instrumentation scopes; expose version getters and setters in `effect/Version`. Preserve custom headers and SDK attributes. `OtlpResource.make()` accepts an omitted service name; `fromConfig()` retains its required `OTEL_SERVICE_NAME` fallback. Environment-only OpenTelemetry resources include SDK defaults.

Logs separate event and observed timestamps, add structured `exception.*` attributes, and use numeric `effect.fiberId` and `effect.log_span.<label>` attributes. Generated attributes override annotations; outermost spans win duplicate labels. OpenTelemetry tracer layers no longer require a `Resource`. Metrics are unchanged.
