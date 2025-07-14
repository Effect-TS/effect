import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"

interface NumberService {
  readonly n: number
}

const NumberService = Context.GenericTag<NumberService>("NumberService")

interface StringService {
  readonly s: string
}

const StringService = Context.GenericTag<StringService>("StringService")

class NumberRepo extends Context.Tag("NumberRepo")<NumberRepo, {
  readonly numbers: Array<number>
}>() {
  static numbers = Effect.serviceConstants(NumberRepo).numbers
}

class DemoTag extends Effect.Tag("DemoTag")<DemoTag, {
  readonly getNumbers: () => Array<number>
  readonly strings: Array<string>
  readonly fn: (...args: ReadonlyArray<string>) => Array<string>
  readonly fnParamsUnion: (
    ...args: ReadonlyArray<string> | [number] | [false, true]
  ) => ReadonlyArray<string> | [number] | [false, true]
  readonly fnGen: <S>(s: S) => Array<S>
}>() {
}

class DateTag extends Effect.Tag("DateTag")<DateTag, Date>() {
  static date = new Date(1970, 1, 1)
  static Live = Layer.succeed(this, this.date)
}

class MapTag extends Effect.Tag("MapTag")<MapTag, Map<string, string>>() {
  static Live = Layer.effect(this, Effect.sync(() => new Map()))
}

class NumberTag extends Effect.Tag("NumberTag")<NumberTag, number>() {
  static Live = Layer.succeed(this, 100)
}

describe("Effect", () => {
  it.effect("provide runtime is additive", () =>
    Effect.gen(function*() {
      const runtime = yield* Effect.runtime<never>()
      const env = yield* NumberService.pipe(
        Effect.provide(runtime),
        Effect.provideService(NumberService, { n: 1 })
      )
      deepStrictEqual(env, { n: 1 })
    }))
  describe("and Then", () => {
    it.effect("effect tag", () =>
      Effect.gen(function*() {
        const [n, s, z] = yield* (Effect.all([
          Effect.andThen(Effect.void, DemoTag.getNumbers),
          Effect.andThen(Effect.succeed("a"), DemoTag.strings),
          Effect.andThen(Effect.succeed("a"), DemoTag.fn)
        ]))
        deepStrictEqual(n, [0, 1])
        deepStrictEqual(s, ["a", "b"])
        deepStrictEqual(z, ["a"])
      }).pipe(Effect.provideService(DemoTag, {
        getNumbers: () => [0, 1],
        strings: ["a", "b"],
        fn: (...args) => Array.from(args),
        fnGen: (s) => [s],
        fnParamsUnion: (..._args) => _args
      })))
  })
  it.effect("effect tag", () =>
    Effect.gen(function*() {
      const [n, s, z, zUnion] = yield* (Effect.all([
        DemoTag.getNumbers(),
        DemoTag.strings,
        DemoTag.fn("a", "b", "c"),
        DemoTag.fnParamsUnion(1)
      ]))
      const s2 = yield* (DemoTag.pipe(Effect.map((_) => _.strings)))
      const s3 = yield* (DemoTag.use((_) => _.fnGen("hello")))
      deepStrictEqual(n, [0, 1])
      deepStrictEqual(s, ["a", "b"])
      deepStrictEqual(z, ["a", "b", "c"])
      deepStrictEqual(zUnion, [1])
      deepStrictEqual(s2, ["a", "b"])
      deepStrictEqual(s3, ["hello"])
    }).pipe(Effect.provideService(DemoTag, {
      getNumbers: () => [0, 1],
      strings: ["a", "b"],
      fn: (...args) => Array.from(args),
      fnGen: (s) => [s],
      fnParamsUnion: (..._args) => _args
    })))
  it.effect("effect tag with primitives", () =>
    Effect.gen(function*() {
      strictEqual(yield* (DateTag.getTime()), DateTag.date.getTime())
      strictEqual(yield* NumberTag, 100)
      deepStrictEqual(Array.from(yield* (MapTag.keys())), [])
      yield* (MapTag.set("foo", "bar"))
      deepStrictEqual(Array.from(yield* (MapTag.keys())), ["foo"])
      strictEqual(yield* (MapTag.get("foo")), "bar")
    }).pipe(
      Effect.provide(Layer.mergeAll(
        DateTag.Live,
        NumberTag.Live,
        MapTag.Live
      ))
    ))
  it.effect("class tag", () =>
    Effect.gen(function*() {
      yield* (
        Effect.flatMap(NumberRepo.numbers, (_) => Effect.log(`Numbers: ${_}`)).pipe(
          Effect.provideService(NumberRepo, { numbers: [0, 1, 2] })
        )
      )
    }))
  it.effect("environment - provide is modular", () =>
    pipe(
      Effect.gen(function*() {
        const v1 = yield* NumberService
        const v2 = yield* (
          pipe(
            NumberService,
            Effect.provide(Context.make(NumberService, { n: 2 }))
          )
        )
        const v3 = yield* NumberService
        strictEqual(v1.n, 4)
        strictEqual(v2.n, 2)
        strictEqual(v3.n, 4)
      }),
      Effect.provide(Context.make(NumberService, { n: 4 }))
    ))
  it.effect("environment - provideSomeContext provides context in the right order", () =>
    pipe(
      Effect.gen(function*() {
        const v1 = yield* NumberService
        const v2 = yield* StringService
        strictEqual(v1.n, 1)
        strictEqual(v2.s, "ok")
      }),
      Effect.provide(Context.make(NumberService, { n: 1 })),
      Effect.provide(Context.make(NumberService, { n: 2 })),
      Effect.provide(Context.make(StringService, { s: "ok" }))
    ))
  it.effect("environment - async can use environment", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.async<number, never, NumberService>((cb) => cb(Effect.map(NumberService, ({ n }) => n))),
        Effect.provide(Context.make(NumberService, { n: 10 }))
      )
      strictEqual(result, 10)
    }))
  it.effect("serviceWith - effectfully accesses a service in the environment", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.flatMap(NumberService, ({ n }) => Effect.succeed(n + 3)),
        Effect.provide(Context.make(NumberService, { n: 0 }))
      )
      strictEqual(result, 3)
    }))
  // TODO: remove
  // it.effect("serviceWith - traced tag", () =>
  //   Effect.gen(function*() {
  //     const result = yield* (
  //       Effect.flatMap(NumberService.traced(sourceLocation(new Error())), ({ n }) => Effect.succeed(n + 3)),
  //       Effect.provide(Context.make(NumberService, { n: 0 }))
  //     )
  //     strictEqual(result, 3)
  //   }))
  it.effect("updateService - updates a service in the environment", () =>
    pipe(
      Effect.gen(function*() {
        const a = yield* pipe(NumberService, Effect.updateService(NumberService, ({ n }) => ({ n: n + 1 })))
        const b = yield* NumberService
        strictEqual(a.n, 1)
        strictEqual(b.n, 0)
      }),
      Effect.provide(Context.make(NumberService, { n: 0 }))
    ))

  it.effect("serviceFunctions - expose service functions", () => {
    interface Service {
      foo: (x: string, y: number) => Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
    const { foo } = Effect.serviceFunctions(Service)
    return pipe(
      Effect.gen(function*() {
        strictEqual(yield* foo("a", 3), "a3")
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
      baz: Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
    const { baz } = Effect.serviceConstants(Service)
    return pipe(
      Effect.gen(function*() {
        strictEqual(yield* baz, "42!")
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
      foo: (x: string, y: number) => Effect.Effect<string>
      baz: Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
    const { constants, functions } = Effect.serviceMembers(Service)
    return pipe(
      Effect.gen(function*() {
        strictEqual(yield* constants.baz, "42!")
        strictEqual(yield* functions.foo("a", 3), "a3")
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
