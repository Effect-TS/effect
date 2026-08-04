import { assert, it } from "@effect/vitest"
import { Config, ConfigProvider, Effect, Result } from "effect"

it.effect("preserves sibling input evidence when recovering an all failure", () =>
  Effect.gen(function*() {
    const sourceError = new ConfigProvider.SourceError({ message: "source unavailable" })
    const provider = ConfigProvider.make((path) => {
      if (path[0] === "failed") return Effect.fail(sourceError)
      if (path[0] === "present") return Effect.succeed(ConfigProvider.makeValue("value"))
      return Effect.succeed(undefined)
    })
    const recovered = Config.all({
      failed: Config.string("failed"),
      present: Config.string("present")
    }).pipe(Config.orElse(() => Config.succeed({ failed: "recovered", present: "recovered" })))
    const fallback = {
      recovered: { failed: "default", present: "default" },
      required: "default"
    }
    const config = Config.all({
      recovered,
      required: Config.string("required")
    }).pipe(Config.withDefault(fallback))

    const result = yield* config.parse(provider).pipe(
      Effect.mapError((error) => error.cause.message),
      Effect.result
    )
    assert.deepStrictEqual(
      result,
      Result.fail(`Expected string, got undefined
  at ["required"]`)
    )
  }))
