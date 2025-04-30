import { describe, it } from "@effect/vitest"
import { assertFailure, assertSuccess } from "@effect/vitest/utils"
import type { Config } from "effect"
import { Cause, ConfigError, ConfigProvider, Effect, Schema } from "effect"

/**
 * Asserts that loading a configuration with invalid data fails with the expected error.
 */
const assertConfigFailure = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  error: ConfigError.ConfigError
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  assertFailure(result, Cause.fail(error))
}

/**
 * Asserts that loading a configuration with valid data succeeds and returns the expected value.
 */
const assertConfigSuccess = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  assertSuccess(result, a)
}

describe("Config", () => {
  it("should validate the configuration schema correctly", () => {
    const config = Schema.Config("A", Schema.NonEmptyString)
    assertConfigSuccess(config, [["A", "a"]], "a")
    assertConfigFailure(config, [], ConfigError.MissingData(["A"], `Expected A to exist in the provided map`))
    assertConfigFailure(
      config,
      [["A", ""]],
      ConfigError.InvalidData(
        ["A"],
        `NonEmptyString
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
      )
    )
  })

  it("should work with a template literal", () => {
    const config = Schema.Config("A", Schema.TemplateLiteral("a", Schema.Number))
    assertConfigSuccess(config, [["A", "a1"]], "a1")
    assertConfigFailure(
      config,
      [["A", "ab"]],
      ConfigError.InvalidData(
        ["A"],
        `Expected \`a$\{number}\`, actual "ab"`
      )
    )
  })
})
