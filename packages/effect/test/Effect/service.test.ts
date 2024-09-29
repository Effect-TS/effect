import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
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

describe("Effect.Service", () => {
  it.effect("correctly wires dependencies", () =>
    Effect.gen(function*() {
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
    }).pipe(
      Effect.provide([Logger, Prefix, Postfix])
    ))

  it.effect("inherits prototype", () => {
    class Time extends Effect.Service<Time>()("Time", {
      sync: () => ({ time: new Date() }),
      accessors: true
    }) {
      #now: Date | undefined
      get now() {
        return this.#now ||= new Date()
      }
    }
    return Effect.gen(function*() {
      const time = yield* Time.use((_) => _.now)
      const accessed = yield* Time.time
      expect(time).toBeInstanceOf(Date)
      expect(accessed).toStrictEqual(time)
    }).pipe(Effect.provide(Time))
  })
})
