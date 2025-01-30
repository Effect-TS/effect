import type * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import { assertFailure, assertSuccess } from "effect/test/util"
import { describe, it } from "vitest"

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
  assertFailure(result, Exit.fail(error))
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
