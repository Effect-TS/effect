---
"@effect/opentelemetry": patch
---

add Otlp module to @effect/opentelemetry

This module allows you to setup an exporter for Traces, Metrics & Logs with one
Layer.

It also has no dependency on the @opentelemetry libraries, so you don't need to
add any additional deps to your package.json.

```ts
import * as Otlp from "@effect/opentelemetry/Otlp"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { Effect, Layer, Schedule } from "effect"

// Includes an Effect Tracer, Logger & Metric exporter
const Observability = Otlp.layer({
  baseUrl: "http://localhost:4318",
  resource: {
    serviceName: "my-service"
  }
}).pipe(Layer.provide(FetchHttpClient.layer))
```
