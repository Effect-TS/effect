import { assert, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"

it.effect("uses a populated variable instead of its expansion default", () =>
  Effect.gen(function*() {
    const provider = ConfigProvider.fromDotEnvContents(
      "SET=actual\nDEFAULTED=${SET:-fallback}",
      { expandVariables: true }
    )

    assert.deepStrictEqual(
      yield* provider.load(["DEFAULTED"]),
      ConfigProvider.makeValue("actual")
    )
  }))
