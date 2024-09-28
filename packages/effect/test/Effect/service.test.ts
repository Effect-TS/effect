import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as it from "effect/test/utils/extend"
import { describe, expect } from "vitest"

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
  proxy: true,
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
  static Test = Layer.succeed(this, Logger.make({ info: () => Effect.void }))
  static TestWithNew = Layer.succeed(this, new Logger({ info: () => Effect.void }))
}

describe("Effect", () => {
  it.effect("Service correctly wires dependencies", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
      expect(yield* Postfix.use((_) => _._tag)).toEqual("Postfix")
    }).pipe(
      Effect.provide([Logger, Prefix, Postfix])
    ))

  it.effect("Test instance works", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual([])
    }).pipe(
      Effect.provide([Logger.Test])
    ))

  it.effect("Test with new instance works", () =>
    Effect.gen(function*() {
      messages.splice(0)
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual([])
    }).pipe(
      Effect.provide([Logger.TestWithNew])
    ))
})
