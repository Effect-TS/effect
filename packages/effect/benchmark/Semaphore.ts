import { Effect, Semaphore } from "effect"
import { Bench } from "tinybench"

const bench = new Bench({ time: 1_000, iterations: 5, warmupTime: 500, warmupIterations: 2 })

for (const [capacity, permits] of [[1, 1], [3, 2]]) {
  for (const size of [4_000, 16_000]) {
    const drain = Effect.gen(function*() {
      const semaphore = yield* Semaphore.make(capacity)
      yield* Effect.replicateEffect(semaphore.withPermits(permits)(Effect.yieldNow), size, {
        concurrency: "unbounded",
        discard: true
      })
    })
    bench.add(`${size} requests, ${permits}/${capacity} permits`, () => Effect.runPromise(drain))
  }
}

await bench.run()
console.table(bench.table())
