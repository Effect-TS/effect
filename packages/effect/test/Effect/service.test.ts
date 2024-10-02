import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import { describe, expect, it } from "effect/test/utils/extend"

class Prefix extends Effect.Service<Prefix>()("Prefix", {
  sync: () => ({
    prefix: "PRE"
  })
}) {}

class Postfix extends Effect.Service<Postfix>()("Postfix", {
  accessors: true,
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
  dependencies: [Prefix, Postfix]
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
  dependencies: [Prefix, Postfix]
}) {
}

describe("Effect.Service", () => {
  it("tags are both layers and tags", () => {
    expect(Layer.isLayer(Logger)).toBe(true)
    expect(Context.isTag(Logger)).toBe(true)
  })

  it.effect("correctly wires dependencies", () =>
    Effect.gen(function*() {
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
      expect(yield* Prefix.use((_) => _._tag)).toBe("Prefix")
    }).pipe(
      Effect.provide([Logger, Prefix, Postfix])
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
      expect(time).toBeInstanceOf(Date)
    }).pipe(Effect.provide(Time))
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
      expect(time).toStrictEqual(time2)
    }).pipe(Effect.provide(Time))
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
      expect(date).toBeInstanceOf(Date)
      expect(time).toBeInstanceOf(Time)
      expect(time).toBeInstanceOf(TimeLive)
    }).pipe(Effect.provide(Time))
  })

  it.effect("js primitive", () =>
    Effect.gen(function*() {
      class MapThing extends Effect.Service<MapThing>()("MapThing", {
        sync: () => new Map<string, number>(),
        accessors: true
      }) {}

      const map = yield* MapThing.use((_) => _.set("a", 1)).pipe(
        Effect.provide(MapThing)
      )

      expect(map).toBeInstanceOf(MapThing)
      expect(map).toBeInstanceOf(Map)

      const map2 = yield* MapThing.set("a", 1).pipe(
        Effect.provide(MapThing)
      )

      expect(map2).toBeInstanceOf(MapThing)
      expect(map2).toBeInstanceOf(Map)
    }))

  it.effect("scoped", () =>
    Effect.gen(function*() {
      yield* Scoped.info("Ok").pipe(Effect.provide(Scoped.Default))
    }))
})
