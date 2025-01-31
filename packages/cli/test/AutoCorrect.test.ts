import * as AutoCorrect from "@effect/cli/AutoCorrect"
import * as CliConfig from "@effect/cli/CliConfig"
import { describe, expect, it } from "@effect/vitest"

describe("AutoCorrect", () => {
  it("should calculate the correct Levenstein distance between two strings", () => {
    expect(AutoCorrect.levensteinDistance("", "", CliConfig.defaultConfig)).toBe(0)
    expect(AutoCorrect.levensteinDistance("--force", "", CliConfig.defaultConfig)).toBe(7)
    expect(AutoCorrect.levensteinDistance("", "--force", CliConfig.defaultConfig)).toBe(7)
    expect(AutoCorrect.levensteinDistance("--force", "force", CliConfig.defaultConfig)).toBe(2)
    expect(AutoCorrect.levensteinDistance("--force", "--forc", CliConfig.defaultConfig)).toBe(1)
    expect(AutoCorrect.levensteinDistance("foo", "bar", CliConfig.defaultConfig)).toBe(3)
    // By default, the configuration is case-insensitive so options are normalized
    expect(AutoCorrect.levensteinDistance("--force", "--Force", CliConfig.defaultConfig)).toBe(0)
  })

  it("should take into account the provided case-sensitivity", () => {
    const config = CliConfig.make({ isCaseSensitive: true })
    expect(AutoCorrect.levensteinDistance("--force", "--force", config)).toBe(0)
    expect(AutoCorrect.levensteinDistance("--FORCE", "--force", config)).toBe(5)
  })

  it("should calculate the correct Levenstein distance for non-ASCII characters", () => {
    expect(AutoCorrect.levensteinDistance("とんかつ", "とかつ", CliConfig.defaultConfig)).toBe(1)
    expect(AutoCorrect.levensteinDistance("¯\\_(ツ)_/¯", "_(ツ)_/¯", CliConfig.defaultConfig)).toBe(
      2
    )
  })
})
