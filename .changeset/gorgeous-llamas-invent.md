---
"@effect/opentelemetry": patch
---

add withActiveSpan function to attach Effect to current Span

This function allows you to connect the Effect spans into a parent span
that was created outside of Effect, using the OpenTelemetry context propagation:

```ts
Effect.gen(function*() {
  yield* Effect.sleep("100 millis").pipe(Effect.withSpan("sleep"));
  yield* Console.log("done");
}).pipe(
  Effect.withSpan("program"),
  // This connects child spans to the current OpenTelemetry context
  Tracer.withActiveSpan,
)
```
