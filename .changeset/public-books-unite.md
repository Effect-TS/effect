---
"effect": minor
---

add ExecutionPlan module

A `ExecutionPlan` can be used with `Effect.withExecutionPlan` or `Stream.withExecutionPlan`, allowing you to provide different resources for each step of execution until the effect succeeds or the plan is exhausted.

```ts
import { type AiLanguageModel } from "@effect/ai"
import type { Layer } from "effect"
import { Effect, ExecutionPlan, Schedule } from "effect"

declare const layerBad: Layer.Layer<AiLanguageModel.AiLanguageModel>
declare const layerGood: Layer.Layer<AiLanguageModel.AiLanguageModel>

const ThePlan = ExecutionPlan.make({
  // First try with the bad layer 2 times with a 3 second delay between attempts
  provide: layerBad,
  attempts: 2,
  schedule: Schedule.spaced(3000)
}).pipe(
  // Then try with the bad layer 3 times with a 1 second delay between attempts
  ExecutionPlan.orElse({
    provide: layerBad,
    attempts: 3,
    schedule: Schedule.spaced(1000)
  }),
  // Finally try with the good layer.
  //
  // If `attempts` is omitted, the plan will only attempt once, unless a schedule is provided.
  ExecutionPlan.orElse({
    provide: layerGood
  })
)

declare const effect: Effect.Effect<
  void,
  never,
  AiLanguageModel.AiLanguageModel
>
const withPlan: Effect.Effect<void> = Effect.withExecutionPlan(effect, ThePlan)
```
