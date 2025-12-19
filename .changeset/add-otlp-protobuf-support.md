---
"@effect/opentelemetry": minor
---

Add protobuf protocol support for OTLP exporters.

This adds a `protocol` option to `Otlp.layer`, `OtlpTracer.layer`, `OtlpMetrics.layer`, and `OtlpLogger.layer` that allows choosing between JSON (default) and Protocol Buffers binary encoding when exporting telemetry data to OpenTelemetry collectors.

```typescript
import { Otlp } from "@effect/opentelemetry"

// Use protobuf encoding for more efficient wire format
Otlp.layer({
  baseUrl: "http://localhost:4318",
  protocol: "protobuf",
  resource: { serviceName: "my-service" }
})
```

- No new dependencies - protobuf encoding implemented from scratch
- Sets appropriate Content-Type header (`application/x-protobuf` vs `application/json`)
- Follows opentelemetry-proto specifications
