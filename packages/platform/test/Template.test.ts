import { Template } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Effect, Option, Stream } from "effect"

describe("Template", () => {
  test("it consolidates Effects", () =>
    Effect.gen(function*() {
      const t = Template.make`<html>${
        Effect.succeed("<body>").pipe(
          Effect.delay(10)
        )
      }${Option.some(123)}${Option.none()}</html>`
      const result = yield* t
      strictEqual(result, `<html><body>123</html>`)
    }).pipe(Effect.runPromise))

  test("streaming", () =>
    Effect.gen(function*() {
      const t = Template.stream`<html>${Effect.succeed("<body>")}${Stream.make("one", " ", "two")}</html>`
      const result = yield* Stream.mkString(t)
      strictEqual(result, `<html><body>one two</html>`)
    }).pipe(Effect.runPromise))
})
