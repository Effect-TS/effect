import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Queue } from "effect"
import { Reactivity } from "effect/unstable/reactivity"

describe("Reactivity", () => {
  for (
    const [name, keys] of [
      ["unique array keys", ["todos"]],
      ["duplicate array keys", ["todos", "todos"]],
      ["unique record IDs", { todos: [1, 2] }],
      ["duplicate record IDs", { todos: [1, 1] }]
    ] as const
  ) {
    it.effect(`query scope cleanup with ${name}`, () =>
      Effect.gen(function*() {
        const reactivity = yield* Reactivity.make
        const exit = yield* reactivity.query(keys, Effect.succeed(42)).pipe(
          Effect.flatMap(Queue.take),
          Effect.scoped,
          Effect.exit
        )
        assert.deepEqual(exit, Exit.succeed(42))
      }))

    it.effect(`query cleanup preserves other subscriptions with ${name}`, () =>
      Effect.gen(function*() {
        const reactivity = yield* Reactivity.make
        const invalidationKeys = Array.isArray(keys) ? ["todos"] : ["todos:1"]
        let survivingRuns = 0
        let removedRuns = 0
        const surviving = yield* reactivity.query(invalidationKeys, Effect.sync(() => ++survivingRuns))
        assert.strictEqual(yield* Queue.take(surviving), 1)

        yield* Effect.gen(function*() {
          const removed = yield* reactivity.query(keys, Effect.sync(() => ++removedRuns))
          assert.strictEqual(yield* Queue.take(removed), 1)
          yield* reactivity.invalidate(invalidationKeys)
          assert.strictEqual(yield* Queue.take(removed), 2)
          assert.strictEqual(yield* Queue.take(surviving), 2)
        }).pipe(Effect.scoped)

        yield* reactivity.invalidate(invalidationKeys)
        assert.strictEqual(yield* Queue.take(surviving), 3)
        assert.strictEqual(removedRuns, 2)
      }))
  }
})
