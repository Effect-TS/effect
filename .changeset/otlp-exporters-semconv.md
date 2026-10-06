---
"effect": patch
"@effect/opentelemetry": patch
---

Align built-in OTLP and `@effect/opentelemetry` logs, traces, and resources with OpenTelemetry conventions. Add public `effect/Version` getters and setters backed by the release version. Include that version in exporter User-Agent headers, SDK resource defaults, and `effect` log/trace scopes while preserving user-supplied headers and SDK attributes. Built-in resources no longer require a service name or add a fallback; environment-only OpenTelemetry resources now include SDK defaults.

Logs distinguish event and observed timestamps, emit structured `exception.*` attributes, and use numeric `effect.fiberId` and `effect.log_span.<label>` attributes. Generated attributes override annotations, and outermost spans win duplicate labels. OpenTelemetry tracer layers no longer require a `Resource`. Metrics are unchanged.
