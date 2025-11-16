---
"effect": patch
---

add experimental PartitionedSemaphore module

A `PartitionedSemaphore` is a concurrency primitive that can be used to
control concurrent access to a resource across multiple partitions identified
by keys.

The total number of permits is shared across all partitions, with waiting
permits equally distributed among partitions using a round-robin strategy.

This is useful when you want to limit the total number of concurrent accesses
to a resource, while still allowing for fair distribution of access across
different partitions.

```ts
import { Effect, PartitionedSemaphore } from "effect"

Effect.gen(function* () {
  const semaphore = yield* PartitionedSemaphore.make<string>({ permits: 5 })

  // Take the first 5 permits with key "A", then the following permits will be
  // equally distributed between all the keys using a round-robin strategy
  yield* Effect.log("A").pipe(
    Effect.delay(1000),
    semaphore.withPermits("A", 1),
    Effect.replicateEffect(15, { concurrency: "unbounded" }),
    Effect.fork
  )
  yield* Effect.log("B").pipe(
    Effect.delay(1000),
    semaphore.withPermits("B", 1),
    Effect.replicateEffect(10, { concurrency: "unbounded" }),
    Effect.fork
  )
  yield* Effect.log("C").pipe(
    Effect.delay(1000),
    semaphore.withPermits("C", 1),
    Effect.replicateEffect(10, { concurrency: "unbounded" }),
    Effect.fork
  )

  return yield* Effect.never
}).pipe(Effect.runFork)
```
