---
"@effect/opentelemetry": minor
---

feat(OtlpExporter): expose internal OTLP exporter as public API

The internal OTLP exporter is now available as `OtlpExporter.make()`. This allows building custom multi-endpoint tracers or composing multiple exporters without copying internal code.

Example:
```typescript
import { OtlpExporter } from "@effect/opentelemetry"

const exporter = yield* OtlpExporter.make({
  url: "https://api.honeycomb.io/v1/traces",
  headers: { "x-honeycomb-team": "api-key" },
  label: "honeycomb",
  exportInterval: "5 seconds",
  maxBatchSize: 100,
  body: (spans) => ({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
  shutdownTimeout: "3 seconds"
})

exporter.push(spanData)
```
