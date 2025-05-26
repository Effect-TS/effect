import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Array, Effect, ExecutionPlan, Exit, Layer, Stream } from "effect"

describe("ExecutionPlan", () => {
  class Service extends Effect.Service<Service>()("Service", {
    succeed: {
      stream: Stream.fail("A") as Stream.Stream<number, string>
    }
  }) {
    static B = Layer.succeed(
      Service,
      new Service({
        stream: Stream.fail("B")
      })
    )
    static C = Layer.succeed(
      Service,
      new Service({
        stream: Stream.make(1, 2, 3)
      })
    )
  }

  const Plan = ExecutionPlan.make({
    provide: Service.Default
  }, {
    provide: Service.B
  }, {
    provide: Service.C
  })

  const PlanPartial = ExecutionPlan.make({
    provide: Layer.succeed(
      Service,
      new Service({
        stream: Stream.make(1, 2, 3).pipe(
          Stream.concat(Stream.fail("Partial"))
        )
      })
    )
  }, {
    provide: Service.C
  })

  describe("Stream.withExecutionPlan", () => {
    it.effect("fallback", () =>
      Effect.gen(function*() {
        const stream = Stream.unwrap(Effect.map(Service, (_) => _.stream))
        const items = Array.empty<number>()
        const result = yield* stream.pipe(
          Stream.withExecutionPlan(Plan),
          Stream.runForEach((n) =>
            Effect.sync(() => {
              items.push(n)
            })
          ),
          Effect.exit
        )
        deepStrictEqual(items, [1, 2, 3])
        assertTrue(Exit.isSuccess(result))
      }))

    it.effect("fallback from partial stream", () =>
      Effect.gen(function*() {
        const stream = Stream.unwrap(Effect.map(Service, (_) => _.stream))
        const items = Array.empty<number>()
        const result = yield* stream.pipe(
          Stream.withExecutionPlan(PlanPartial),
          Stream.runForEach((n) =>
            Effect.sync(() => {
              items.push(n)
            })
          ),
          Effect.exit
        )
        deepStrictEqual(items, [1, 2, 3, 1, 2, 3])
        assertTrue(Exit.isSuccess(result))
      }))

    it.effect("preventFallbackOnPartialStream", () =>
      Effect.gen(function*() {
        const stream = Stream.unwrap(Effect.map(Service, (_) => _.stream))
        const items = Array.empty<number>()
        const result = yield* stream.pipe(
          Stream.withExecutionPlan(PlanPartial, {
            preventFallbackOnPartialStream: true
          }),
          Stream.runForEach((n) =>
            Effect.sync(() => {
              items.push(n)
            })
          ),
          Effect.exit
        )
        deepStrictEqual(items, [1, 2, 3])
        deepStrictEqual(result, Exit.fail("Partial"))
      }))
  })
})
