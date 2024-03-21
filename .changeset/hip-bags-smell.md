---
"effect": patch
---

add fiber ref for disabling the tracer

You can use it with the Effect.withTracerEnabled api:

```ts
import { Effect } from "effect";

Effect.succeed(42).pipe(
  Effect.withSpan("my-span"),
  // the span will not be registered with the tracer
  Effect.withTracerEnabled(false),
);
```
