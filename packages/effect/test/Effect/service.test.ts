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
  withAccessors: true,
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
  dependencies: [Prefix.Live, Postfix.Live]
}) {
  static Test = Layer.succeed(this, Logger.of({ info: () => Effect.void }))
}

describe("Effect", () => {
  it.effect("Service correctly wires dependencies", () =>
    Effect.gen(function*() {
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
    }).pipe(
      Effect.provide([Logger.Live, Prefix.Live, Postfix.Live])
    ))
})
