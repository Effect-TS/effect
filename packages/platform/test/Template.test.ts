import { Template } from "@effect/platform"
import { Effect, Option, Stream } from "effect"
import { assert, describe, test } from "vitest"

describe("Template", () => {
  test("it consolidates Effects", () =>
    Effect.gen(function*(_) {
      const t = Template.make`<html>${
        Effect.succeed("<body>").pipe(
          Effect.delay(10)
        )
      }${Option.some(123)}${Option.none()}</html>`
      const result = yield* _(t)
      assert.strictEqual(result, `<html><body>123</html>`)
    }).pipe(Effect.runPromise))

  test("streaming", () =>
    Effect.gen(function*(_) {
      const t = Template.stream`<html>${Effect.succeed("<body>")}${Stream.make("one", " ", "two")}</html>`
      const result = yield* _(Stream.mkString(t))
      assert.strictEqual(result, `<html><body>one two</html>`)
    }).pipe(Effect.runPromise))
})
