import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as it from "effect/test/utils/extend"
import { assert, describe, expect } from "vitest"

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
      expect(env).toStrictEqual({ n: 1 })
    }))
  describe("and Then", () => {
    it.effect("effect tag", () =>
      Effect.gen(function*($) {
        const [n, s, z] = yield* $(Effect.all([
          Effect.andThen(Effect.void, DemoTag.getNumbers),
          Effect.andThen(Effect.succeed("a"), DemoTag.strings),
          Effect.andThen(Effect.succeed("a"), DemoTag.fn)
        ]))
        expect(n).toEqual([0, 1])
        expect(s).toEqual(["a", "b"])
        expect(z).toEqual(["a"])
      }).pipe(Effect.provideService(DemoTag, {
        getNumbers: () => [0, 1],
        strings: ["a", "b"],
        fn: (...args) => Array.from(args),
        fnGen: (s) => [s]
      })))
  })
  it.effect("effect tag", () =>
    Effect.gen(function*($) {
      const [n, s, z] = yield* $(Effect.all([
        DemoTag.getNumbers(),
        DemoTag.strings,
        DemoTag.fn("a", "b", "c")
      ]))
      const s2 = yield* $(DemoTag.pipe(Effect.map((_) => _.strings)))
      const s3 = yield* $(DemoTag.use((_) => _.fnGen("hello")))
      expect(n).toEqual([0, 1])
      expect(s).toEqual(["a", "b"])
      expect(z).toEqual(["a", "b", "c"])
      expect(s2).toEqual(["a", "b"])
      expect(s3).toEqual(["hello"])
    }).pipe(Effect.provideService(DemoTag, {
      getNumbers: () => [0, 1],
      strings: ["a", "b"],
      fn: (...args) => Array.from(args),
      fnGen: (s) => [s]
    })))
  it.effect("effect tag with primitives", () =>
    Effect.gen(function*($) {
      expect(yield* $(DateTag.getTime())).toEqual(DateTag.date.getTime())
      expect(yield* $(NumberTag)).toEqual(100)
      expect(Array.from(yield* $(MapTag.keys()))).toEqual([])
      yield* $(MapTag.set("foo", "bar"))
      expect(Array.from(yield* $(MapTag.keys()))).toEqual(["foo"])
      expect(yield* $(MapTag.get("foo"))).toEqual("bar")
    }).pipe(
      Effect.provide(Layer.mergeAll(
        DateTag.Live,
        NumberTag.Live,
        MapTag.Live
      ))
    ))
  it.effect("class tag", () =>
    Effect.gen(function*($) {
      yield* $(
        Effect.flatMap(NumberRepo.numbers, (_) => Effect.log(`Numbers: ${_}`)).pipe(
          Effect.provideService(NumberRepo, { numbers: [0, 1, 2] })
        )
      )
    }))
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
        Effect.async<number, never, NumberService>((cb) => cb(Effect.map(NumberService, ({ n }) => n))),
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
      foo: (x: string, y: number) => Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
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
      baz: Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
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
      foo: (x: string, y: number) => Effect.Effect<string>
      baz: Effect.Effect<string>
    }
    const Service = Context.GenericTag<Service>("Service")
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
