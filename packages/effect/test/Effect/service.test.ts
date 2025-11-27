import { describe, it } from "@effect/vitest"
import { assertInstanceOf, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { flow, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

class Prefix extends Effect.Service<Prefix>()("Prefix", {
  sync: () => ({
    prefix: "PRE"
  })
}) {}

class Postfix extends Effect.Service<Postfix>()("Postfix", {
  sync: () => ({
    postfix: "POST"
  })
}) {}

const messages: Array<string> = []

class Logger extends Effect.Service<Logger>()("Logger", {
  accessors: true,
  effect: Effect.gen(function*() {
    const { prefix } = yield* Prefix
    const { postfix } = yield* Postfix
    return {
      info: (message: string) =>
        Effect.sync(() => {
          messages.push(`[${prefix}][${message}][${postfix}]`)
        })
    }
  }),
  dependencies: [Prefix.Default, Postfix.Default]
}) {
  static Test = Layer.succeed(this, new Logger({ info: () => Effect.void }))
}

class Scoped extends Effect.Service<Scoped>()("Scoped", {
  accessors: true,
  scoped: Effect.gen(function*() {
    const { prefix } = yield* Prefix
    const { postfix } = yield* Postfix
    yield* Scope.Scope
    return {
      info: (message: string) =>
        Effect.sync(() => {
          messages.push(`[${prefix}][${message}][${postfix}]`)
        })
    }
  }),
  dependencies: [Prefix.Default, Postfix.Default]
}) {}

describe("Effect.Service", () => {
  it("make is a function", () => {
    assertTrue(pipe({ prefix: "OK" }, Prefix.make) instanceof Prefix)
  })
  it("tags is a tag and default is a layer", () => {
    assertTrue(Layer.isLayer(Logger.Default))
    assertTrue(Layer.isLayer(Logger.DefaultWithoutDependencies))
    assertTrue(Context.isTag(Logger))
  })

  it.effect("correctly wires dependencies", () =>
    Effect.gen(function*() {
      yield* Logger.info("Ok")
      deepStrictEqual(messages, ["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      strictEqual(prefix, "PRE")
      const { postfix } = yield* Postfix
      strictEqual(postfix, "POST")
      strictEqual(yield* Prefix.use((_) => _._tag), "Prefix")
    }).pipe(
      Effect.provide([
        Logger.Default,
        Prefix.Default,
        Postfix.Default
      ])
    ))

  it.effect("inherits prototype", () => {
    class Time extends Effect.Service<Time>()("Time", {
      sync: () => ({}),
      accessors: true
    }) {
      #now: Date | undefined
      get now() {
        return this.#now ||= new Date()
      }
    }
    return Effect.gen(function*() {
      const time = yield* Time.use((_) => _.now)
      assertInstanceOf(time, Date)
    }).pipe(Effect.provide(Time.Default))
  })

  it.effect("support values with prototype", () => {
    class DateTest {
      #now: Date | undefined
      get now() {
        return this.#now ||= new Date()
      }
    }
    class Time extends Effect.Service<Time>()("Time", {
      sync: () => new DateTest(),
      accessors: true
    }) {
      get now2() {
        return this.now
      }
    }
    return Effect.gen(function*() {
      const time = yield* Time.use((_) => _.now)
      const time2 = yield* Time.use((_) => _.now2)
      strictEqual(time, time2)
    }).pipe(Effect.provide(Time.Default))
  })

  it.effect("prototype chain", () => {
    class TimeLive {
      #now: Date | undefined
      constructor(now?: Date) {
        this.#now = now
      }
      get now() {
        return this.#now ||= new Date()
      }
    }

    class Time extends Effect.Service<Time>()("Time", {
      effect: Effect.sync(() => new TimeLive()),
      accessors: true
    }) {}

    return Effect.gen(function*() {
      const time = yield* Time
      const date = yield* Time.use((_) => _.now)
      assertInstanceOf(date, Date)
      assertInstanceOf(time, Time)
      assertInstanceOf(time, TimeLive)
    }).pipe(Effect.provide(Time.Default))
  })

  it.effect("js primitive", () =>
    Effect.gen(function*() {
      class MapThing extends Effect.Service<MapThing>()("MapThing", {
        sync: () => new Map<string, number>(),
        accessors: true
      }) {}

      const map = yield* MapThing.use((_) => _.set("a", 1)).pipe(
        Effect.provide(MapThing.Default)
      )

      assertInstanceOf(map, MapThing)
      assertInstanceOf(map, Map)

      const map2 = yield* MapThing.set("a", 1).pipe(
        Effect.provide(MapThing.Default)
      )

      assertInstanceOf(map2, MapThing)
      assertInstanceOf(map2, Map)
    }))

  it.effect("scoped", () =>
    Effect.gen(function*() {
      yield* Scoped.info("Ok").pipe(Effect.provide(Scoped.Default))
    }))

  it.effect("promises", () =>
    Effect.gen(function*() {
      class Service extends Effect.Service<Service>()("Service", {
        succeed: {
          foo: () => Promise.reject(new Error("foo")),
          bar: () => Promise.resolve("bar")
        },
        accessors: true
      }) {}

      const withUse = yield* Service.use((_) => _.foo()).pipe(Effect.flip, Effect.provide(Service.Default))
      deepStrictEqual(
        withUse,
        new Cause.UnknownException(new Error("foo"), "An unknown error occurred in Effect.andThen")
      )

      const accessor = yield* Service.foo().pipe(Effect.flip, Effect.provide(Service.Default))
      deepStrictEqual(
        accessor,
        new Cause.UnknownException(new Error("foo"), "An unknown error occurred in Effect.andThen")
      )

      const accessorSuccess = yield* Service.bar().pipe(Effect.provide(Service.Default))
      strictEqual(accessorSuccess, "bar")
    }))

  it.effect("scoped with arguments", () =>
    Effect.gen(function*() {
      class Service extends Effect.Service<Service>()("Service", {
        accessors: true,
        scoped: Effect.fnUntraced(function*(x: number) {
          return { x }
        })
      }) {}

      const x = yield* Service.x.pipe(Effect.provide(Service.Default(42)))
      strictEqual(x, 42)
      const x2 = yield* Service.x.pipe(Effect.provide(Service.Default(43)))
      strictEqual(x2, 43)
    }))

  it.effect("scoped with arguments & deps", () =>
    Effect.gen(function*() {
      class Service extends Effect.Service<Service>()("Service", {
        accessors: true,
        dependencies: [Prefix.Default],
        scoped: Effect.fnUntraced(function*(x: number) {
          return { x }
        })
      }) {}

      const x = yield* Service.x.pipe(Effect.provide(Service.Default(42)))
      strictEqual(x, 42)
      const x2 = yield* Service.x.pipe(Effect.provide(Service.DefaultWithoutDependencies(42)))
      strictEqual(x2, 42)
      const x3 = yield* Service.x.pipe(Effect.provide(Service.Default(43)))
      strictEqual(x3, 43)
    }))

  it.effect("works with flow", () =>
    Effect.gen(function*() {
      class Inc extends Effect.Service<Inc>()("Inc", {
        accessors: true,
        effect: Effect.gen(function*() {
          return { inc: (x: number) => Effect.succeed(x + 1) }
        })
      }) {}

      const x = flow(Inc.inc, Effect.map((n) => n + 2))

      strictEqual(yield* x(2).pipe(Effect.provide(Inc.Default)), 5)
    }))
})
