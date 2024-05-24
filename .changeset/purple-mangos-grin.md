---
"effect": minor
---

add Layer.annotateLogs & Layer.annotateSpans

This allows you to add log & span annotation to a Layer.

```ts
import { Effect, Layer } from "effect";

Layer.effectDiscard(Effect.log("hello")).pipe(
  Layer.annotateLogs({
    service: "my-service",
  }),
);
```
