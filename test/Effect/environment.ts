import * as it from "effect-test/utils/extend"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { assert, describe, expect } from "vitest"

interface NumberService {
  readonly n: number
}

const NumberService = Context.Tag<NumberService>()

interface StringService {
  readonly s: string
}

const StringService = Context.Tag<StringService>()

describe.concurrent("Effect", () => {
  it.effect("environment - provide is modular", () =>
    pipe(
      Effect.gen(function*($) {
        const v1 = yield* $(NumberService)
        const v2 = yield* $(
          pipe(
            NumberService,
            Effect.provide(Context.make(NumberService, { n: 2 }))
          )
        )
        const v3 = yield* $(NumberService)
        assert.strictEqual(v1.n, 4)
        assert.strictEqual(v2.n, 2)
        assert.strictEqual(v3.n, 4)
      }),
      Effect.provide(Context.make(NumberService, { n: 4 }))
    ))
  it.effect("environment - provideSomeContext provides context in the right order", () =>
    pipe(
      Effect.gen(function*($) {
        const v1 = yield* $(NumberService)
        const v2 = yield* $(StringService)
        assert.strictEqual(v1.n, 1)
        assert.strictEqual(v2.s, "ok")
      }),
      Effect.provide(Context.make(NumberService, { n: 1 })),
      Effect.provide(Context.make(NumberService, { n: 2 })),
      Effect.provide(Context.make(StringService, { s: "ok" }))
    ))
  it.effect("environment - async can use environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.async<NumberService, never, number>((cb) => cb(Effect.map(NumberService, ({ n }) => n))),
        Effect.provide(Context.make(NumberService, { n: 10 }))
      )
      assert.strictEqual(result, 10)
    }))
  it.effect("serviceWith - effectfully accesses a service in the environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.flatMap(NumberService, ({ n }) => Effect.succeed(n + 3)),
        Effect.provide(Context.make(NumberService, { n: 0 }))
      )
      assert.strictEqual(result, 3)
    }))
  // TODO: remove
  // it.effect("serviceWith - traced tag", () =>
  //   Effect.gen(function*($) {
  //     const result = yield* $(
  //       Effect.flatMap(NumberService.traced(sourceLocation(new Error())), ({ n }) => Effect.succeed(n + 3)),
  //       Effect.provide(Context.make(NumberService, { n: 0 }))
  //     )
  //     assert.strictEqual(result, 3)
  //   }))
  it.effect("updateService - updates a service in the environment", () =>
    pipe(
      Effect.gen(function*($) {
        const a = yield* $(NumberService, Effect.updateService(NumberService, ({ n }) => ({ n: n + 1 })))
        const b = yield* $(NumberService)
        assert.strictEqual(a.n, 1)
        assert.strictEqual(b.n, 0)
      }),
      Effect.provide(pipe(Context.make(NumberService, { n: 0 })))
    ))

  it.effect("serviceFunctions - expose service functions", () => {
    interface Service {
      foo: (x: string, y: number) => Effect.Effect<never, never, string>
    }
    const Service = Context.Tag<Service>()
    const { foo } = Effect.serviceFunctions(Service)
    return pipe(
      Effect.gen(function*(_) {
        expect(yield* _(foo("a", 3))).toEqual("a3")
      }),
      Effect.provideService(
        Service,
        Service.of({
          foo: (x, y) => Effect.succeed(`${x}${y}`)
        })
      )
    )
  })

  it.effect("serviceConstants - expose service constants", () => {
    interface Service {
      baz: Effect.Effect<never, never, string>
    }
    const Service = Context.Tag<Service>()
    const { baz } = Effect.serviceConstants(Service)
    return pipe(
      Effect.gen(function*(_) {
        expect(yield* _(baz)).toEqual("42!")
      }),
      Effect.provideService(
        Service,
        Service.of({
          baz: Effect.succeed("42!")
        })
      )
    )
  })

  it.effect("serviceMembers - expose both service functions and constants", () => {
    interface Service {
      foo: (x: string, y: number) => Effect.Effect<never, never, string>
      baz: Effect.Effect<never, never, string>
    }
    const Service = Context.Tag<Service>()
    const { constants, functions } = Effect.serviceMembers(Service)
    return pipe(
      Effect.gen(function*(_) {
        expect(yield* _(constants.baz)).toEqual("42!")
        expect(yield* _(functions.foo("a", 3))).toEqual("a3")
      }),
      Effect.provideService(
        Service,
        Service.of({
          baz: Effect.succeed("42!"),
          foo: (x, y) => Effect.succeed(`${x}${y}`)
        })
      )
    )
  })
})
