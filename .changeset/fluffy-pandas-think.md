---
"@effect/opentelemetry": patch
---

add Tracer.withSpanContext

This api is useful for attaching a parent span to an Effect from an opentelemetry
span outside of Effect.

```typescript
import { Effect } from "effect"
import { Tracer } from "@effect/opentelemetry"
import * as OtelApi from "@opentelemetry/api"

await OtelApi.trace.getTracer("test").startActiveSpan(
  "otel-span",
  {
    root: true
  },
  async (span) => {
    try {
      await Effect.runPromise(
        Effect.log("inside otel parent span").pipe(
          Tracer.withSpanContext(span.spanContext())
        )
      )
    } finally {
      span.end()
    }
  }
)
```
