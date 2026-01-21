---
"@effect/opentelemetry": minor
---

Add tree-shakable protobuf protocol support for OTLP exporters with simplified API.

This introduces an `OtlpSerialization` service and simplified layer functions for choosing between JSON and Protocol Buffers encoding when exporting telemetry data.

**JSON encoding (default):**
```typescript
import { Otlp } from "@effect/opentelemetry"

// Option 1: Explicit JSON layer
const layer = Otlp.layerJson({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
})

// Option 2: Use `layer` alias (backwards compatible)
const layer = Otlp.layer({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
})
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

**New exports:**
- `Otlp.layerJson` - OTLP layer with JSON serialization
- `Otlp.layerProtobuf` - OTLP layer with Protobuf serialization
- `Otlp.layer` - Alias for `layerJson` (backwards compatible)
- `OtlpSerialization` - Service definition and layers (`layerJson`, `layerProtobuf`)

**Breaking changes:**
- Removed `Otlp.layerWithSerializer` - use `Otlp.layerJson` or `Otlp.layerProtobuf` instead
- Removed `OtlpSerializer` module - use `OtlpSerialization` instead
- Removed `OtlpSerializerProtobuf` module - use `Otlp.layerProtobuf` or `OtlpSerialization.layerProtobuf` instead

**Features:**
- No new dependencies - protobuf encoding implemented from scratch
- Tree-shakable - protobuf code not in bundle unless `layerProtobuf` is used
- Sets appropriate Content-Type header (`application/x-protobuf` vs `application/json`)
- Follows opentelemetry-proto specifications
