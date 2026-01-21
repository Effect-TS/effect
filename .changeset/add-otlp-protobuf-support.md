---
"@effect/opentelemetry": minor
---

Add protobuf protocol support for OTLP exporters

This introduces an `OtlpSerialization` service for choosing between JSON and Protobuf encoding.

**Breaking changes:**

- `Otlp.layer` now requires an `OtlpSerialization` layer to be provided for
  the desired encoding format.

**JSON encoding:**

```typescript
import { Layer } from "effect"
import { Otlp, OtlpSerialization } from "@effect/opentelemetry"

// Option 1: Explicit JSON layer
const layer = Otlp.layerJson({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
})

// Option 2: Use `layer` and provide OtlpSerialization JSON layer
const layer = Otlp.layer({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
}).pipe(Layer.provide(OtlpSerialization.layerJson))
```

**Protobuf encoding:**

```typescript
import { Otlp } from "@effect/opentelemetry"

// Simply use layerProtobuf for protobuf encoding
const layer = Otlp.layerProtobuf({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
})
```
