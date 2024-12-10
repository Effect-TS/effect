import type * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

/**
 * Asserts that loading a configuration with invalid data fails with the expected error.
 *
 * @param config - The configuration to load.
 * @param map - The map of configuration values.
 * @param error - The expected error.
 */
const assertFailure = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  error: ConfigError.ConfigError
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(result).toStrictEqual(Exit.fail(error))
}

/**
 * Asserts that loading a configuration with valid data succeeds and returns the expected value.
 *
 * @param config - The configuration to load.
 * @param map - The map of configuration values.
 * @param a - The expected value.
 */
const assertSuccess = <A>(
  config: Config.Config<A>,
  map: ReadonlyArray<readonly [string, string]>,
  a: A
) => {
  const configProvider = ConfigProvider.fromMap(new Map(map))
  const result = Effect.runSync(Effect.exit(configProvider.load(config)))
  expect(result).toStrictEqual(Exit.succeed(a))
}

describe("Config", () => {
  it("should validate the configuration schema correctly", () => {
    const config = Schema.Config("A", Schema.NonEmptyString)
    assertSuccess(config, [["A", "a"]], "a")
    assertFailure(config, [], ConfigError.MissingData(["A"], `Expected A to exist in the provided map`))
    assertFailure(
      config,
      [["A", ""]],
      ConfigError.InvalidData(
        ["A"],
        `NonEmptyString
└─ Predicate refinement failure
   └─ Expected NonEmptyString, actual ""`
      )
    )
  })

  it("should work with a template literal", () => {
    const config = Schema.Config("A", Schema.TemplateLiteral("a", Schema.Number))
    assertSuccess(config, [["A", "a1"]], "a1")
    assertFailure(
      config,
      [["A", "ab"]],
      ConfigError.InvalidData(
        ["A"],
        `Expected \`a$\{number}\`, actual "ab"`
      )
    )
  })
})
