import * as it from "effect-test/utils/extend"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as Layer from "effect/Layer"
import * as List from "effect/List"
import * as Logger from "effect/Logger"
import { assert, describe } from "vitest"

const ref = FiberRef.unsafeMake(List.empty<string>())
const env = Tag<"context", number>()

const withValue = (value: string) => Effect.locallyWith(ref, List.prepend(value))

const logRef = (msg: string) =>
  Effect.gen(function*($) {
    const stack = yield* $(FiberRef.get(ref))
    const value = yield* $(env)
    yield* $(Effect.log(`${value} | ${msg} | ${List.toArray(stack).join(" > ")}`))
  })

describe("Effect", () => {
  it.effect("scoped ref", () =>
    Effect.gen(function*($) {
      const messages: Array<unknown> = []
      const layer = Layer.mergeAll(
        Logger.replace(
          Logger.defaultLogger,
          Logger.make((_) => {
            messages.push(_.message)
          })
        ),
        Layer.succeed(env, 1)
      )

      yield* $(
        Effect.acquireRelease(
          withValue("A")(logRef("acquire")),
          () => withValue("R")(logRef("release"))
        ),
        withValue("INNER"),
        Effect.scoped,
        withValue("OUTER"),
        Effect.provide(layer),
        withValue("EXTERN")
      )

      assert.deepStrictEqual(messages, [
        "1 | acquire | A > INNER > OUTER > EXTERN",
        "1 | release | R > INNER > OUTER > EXTERN"
      ])
    }))
})
