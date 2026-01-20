---
"@effect/opentelemetry": minor
---

Add tree-shakable protobuf protocol support for OTLP exporters.

This introduces an `OtlpSerializer` service that allows choosing between JSON (default) and Protocol Buffers binary encoding when exporting telemetry data to OpenTelemetry collectors. The design ensures protobuf code is only included in your bundle when you explicitly opt into it.

**JSON encoding (default) - no changes required:**
```typescript
import { Otlp } from "@effect/opentelemetry"

// Works exactly as before - protobuf code is tree-shaken away
const layer = Otlp.layer({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
})
```

**Protobuf encoding - explicit opt-in:**
```typescript
import { Otlp, OtlpSerializerProtobuf } from "@effect/opentelemetry"
import * as Layer from "effect/Layer"

// Use layerWithSerializer to control the serialization format
// Protobuf code is only included when you import OtlpSerializerProtobuf
const layer = Otlp.layerWithSerializer({
  baseUrl: "http://localhost:4318",
  resource: { serviceName: "my-service" }
}).pipe(Layer.provide(OtlpSerializerProtobuf.protobuf))
```

**New exports:**
- `Otlp.layerWithSerializer` - OTLP layer that requires `OtlpSerializer` to be provided
- `OtlpSerializer` - Service definition and JSON layer (`OtlpSerializer.json`)
- `OtlpSerializerProtobuf` - Protobuf layer (`OtlpSerializerProtobuf.protobuf`)

**Features:**
- No new dependencies - protobuf encoding implemented from scratch
- Tree-shakable - protobuf code not in bundle unless explicitly imported
- Sets appropriate Content-Type header (`application/x-protobuf` vs `application/json`)
- Follows opentelemetry-proto specifications
