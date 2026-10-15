import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { Equal, Hash, Option, pipe, Result, SemVer, SemVerRange } from "effect"

const $ = SemVer.parseUnsafe
const fmt = SemVer.format
const range = SemVerRange.parseUnsafe
const check = (input: string, options?: SemVerRange.MatchOptions) => (version: string) =>
  SemVerRange.matches(range(input), $(version), options)

describe("SemVerRange", () => {
  it("fromInput", () => {
    const caret = range("^1.2")
    deepStrictEqual(SemVerRange.fromInput(caret), Result.succeed(caret))
    strictEqual(SemVerRange.fromInputUnsafe(caret), caret)
    assertTrue(Equal.equals(SemVerRange.fromInputUnsafe("^1.2"), caret))
    const result = SemVerRange.fromInput("^v1")
    assertTrue(Result.isFailure(result) && SemVer.isSemVerError(result.failure))
    throws(() => SemVerRange.fromInputUnsafe("^v1"))
  })

  describe("constructors", () => {
    const version = $("1.2.3-rc.1+build.5")

    it("builds comparator ranges from a version, dropping build metadata", () => {
      for (
        const [built, expected] of [
          [SemVerRange.exact(version), "1.2.3-rc.1"],
          [SemVerRange.greaterThan(version), ">1.2.3-rc.1"],
          [SemVerRange.greaterThanOrEqualTo(version), ">=1.2.3-rc.1"],
          [SemVerRange.lessThan(version), "<1.2.3-rc.1"],
          [SemVerRange.lessThanOrEqualTo(version), "<=1.2.3-rc.1"],
          [SemVerRange.caret(version), "^1.2.3-rc.1"],
          [SemVerRange.tilde(version), "~1.2.3-rc.1"],
          [SemVerRange.between({ minimum: $("1.0.0"), maximum: version }), ">=1.0.0 <=1.2.3-rc.1"],
          [SemVerRange.any, "*"]
        ] as const
      ) {
        strictEqual(SemVerRange.format(built), expected)
        assertTrue(Equal.equals(built, range(expected)))
      }
      assertTrue(Equal.equals(range(""), SemVerRange.any))
    })

    it("matches like the equivalent parsed range", () => {
      const v = $("1.2.3")
      assertTrue(SemVerRange.matches(SemVerRange.exact(v), $("1.2.3+other")))
      assertFalse(SemVerRange.matches(SemVerRange.exact(v), $("1.2.4")))
      assertTrue(SemVerRange.matches(SemVerRange.greaterThan(v), $("1.2.4")))
      assertFalse(SemVerRange.matches(SemVerRange.greaterThan(v), $("1.2.3")))
      assertTrue(SemVerRange.matches(SemVerRange.greaterThanOrEqualTo(v), $("1.2.3")))
      assertTrue(SemVerRange.matches(SemVerRange.lessThan(v), $("1.2.2")))
      assertTrue(SemVerRange.matches(SemVerRange.lessThanOrEqualTo(v), $("1.2.3")))
      assertTrue(SemVerRange.matches(SemVerRange.caret(v), $("1.9.0")))
      assertFalse(SemVerRange.matches(SemVerRange.caret(v), $("2.0.0")))
      assertTrue(SemVerRange.matches(SemVerRange.tilde(v), $("1.2.9")))
      assertFalse(SemVerRange.matches(SemVerRange.tilde(v), $("1.3.0")))
      assertFalse(SemVerRange.matches(SemVerRange.any, $("1.0.0-rc.1")))
      assertTrue(SemVerRange.matches(SemVerRange.any, $("1.0.0-rc.1"), { includePrerelease: true }))
    })

    it("between agrees with SemVer.between", () => {
      const bounds = { minimum: $("1.2.3"), maximum: $("2.0.0") }
      const between = SemVerRange.between(bounds)
      for (const input of ["1.2.2", "1.2.3", "1.5.0", "2.0.0", "2.0.1", "1.5.0-rc.1", "2.0.0-rc.1"]) {
        const v = $(input)
        strictEqual(SemVerRange.matches(between, v, { includePrerelease: true }), SemVer.between(v, bounds), input)
      }
    })
  })

  describe("parse", () => {
    it("keeps written syntax and normalizes wildcard spellings", () => {
      for (
        const [input, expected] of [
          ["^1.2.3", "^1.2.3"],
          ["~1.2", "~1.2"],
          ["1.x", "1"],
          ["1.2.*", "1.2"],
          ["1.X.x", "1"],
          ["x", "*"],
          ["", "*"],
          ["   ", "*"],
          ["=1.2.3", "1.2.3"],
          [">= 1.2.3  <2", ">=1.2.3 <2"],
          ["1.2.3 - 2.x", "1.2.3 - 2"],
          ["^1 ||~2.1  >2.1.5", "^1 || ~2.1 >2.1.5"],
          ["<=1.2.3-beta.1", "<=1.2.3-beta.1"]
        ] as const
      ) {
        strictEqual(SemVerRange.format(range(input)), expected)
      }
    })

    it("exposes the parsed structure", () => {
      deepStrictEqual(range("^1.2 || 1 - 2.0.0-rc.1").sets, [
        [{ _tag: "Comparator", operator: "^", version: { major: 1, minor: 2, patch: undefined, prerelease: [] } }],
        [{
          _tag: "Hyphen",
          from: { major: 1, minor: undefined, patch: undefined, prerelease: [] },
          to: { major: 2, minor: 0, patch: 0, prerelease: ["rc", 1] }
        }]
      ])
    })

    it("rejects invalid ranges", () => {
      for (
        const input of [
          "v1",
          "^v1.2",
          "1.2.3+build",
          "1.x.3",
          "01",
          "1.2-beta",
          "1.2.3.4",
          "1.2.3 ||",
          "|| 1.2.3",
          ">=",
          "~>1.2",
          "1 -",
          "1.2.3 - 2 >1",
          "latest"
        ]
      ) {
        assertTrue(Result.isFailure(SemVerRange.parse(input)), input)
      }
      const result = SemVerRange.parse("1.x.3")
      if (Result.isSuccess(result)) throw new Error("expected failure")
      strictEqual(result.failure.input, "1.x.3")
      assertTrue(SemVer.isSemVerError(result.failure))
      assertTrue(result.failure instanceof SemVer.SemVerError)
      strictEqual(
        result.failure.message,
        `Invalid SemVer range "1.x.3": a version component cannot follow a wildcard, received "1.x.3"`
      )
      throws(() => range("^"))
    })
  })

  it("compares ranges structurally", () => {
    assertTrue(SemVerRange.isSemVerRange(range("^1")))
    assertFalse(SemVerRange.isSemVerRange("^1"))
    assertTrue(Equal.equals(range("1.x || >=2"), range("1 || >= 2")))
    assertFalse(Equal.equals(range("^1"), range("1")))
    strictEqual(Hash.hash(range("1.x")), Hash.hash(range("1")))
    strictEqual(String(range("^1.2")), "SemVerRange(^1.2)")
    deepStrictEqual(range("^1.2").toJSON(), { _id: "SemVerRange", value: "^1.2" })
  })

  describe("matches", () => {
    const cases: ReadonlyArray<readonly [string, ReadonlyArray<string>, ReadonlyArray<string>]> = [
      ["1.2.3", ["1.2.3", "1.2.3+build"], ["1.2.4", "1.2.3-rc.1"]],
      ["1.2", ["1.2.0", "1.2.9"], ["1.1.9", "1.3.0"]],
      ["*", ["0.0.0", "99.0.0"], ["1.0.0-beta"]],
      ["^1.2.3", ["1.2.3", "1.9.9"], ["1.2.2", "2.0.0", "2.0.0-0", "1.5.0-rc.1"]],
      ["^0.2.3", ["0.2.3", "0.2.9"], ["0.3.0"]],
      ["^0.0.3", ["0.0.3"], ["0.0.4"]],
      ["^0.0", ["0.0.0", "0.0.9"], ["0.1.0"]],
      ["^1.x", ["1.0.0", "1.9.0"], ["2.0.0"]],
      ["~1.2.3", ["1.2.3", "1.2.9"], ["1.3.0"]],
      ["~1.2", ["1.2.0", "1.2.9"], ["1.3.0"]],
      ["~1", ["1.0.0", "1.9.0"], ["2.0.0"]],
      [">1.2", ["1.3.0"], ["1.2.9"]],
      [">=1.2", ["1.2.0"], ["1.1.9"]],
      ["<1.2", ["1.1.9"], ["1.2.0"]],
      ["<=1.2", ["1.2.9"], ["1.3.0"]],
      ["<*", [], ["0.0.0"]],
      ["1.2.3 - 2.3.4", ["1.2.3", "2.3.4"], ["1.2.2", "2.3.5"]],
      ["1.2 - 2.3", ["1.2.0", "2.3.9"], ["1.1.9", "2.4.0"]],
      [">=1.2.3 <2 || >=3", ["1.5.0", "3.1.0"], ["2.5.0"]],
      [">1.2.3-alpha.3", ["1.2.3-alpha.7", "3.4.5"], ["3.4.5-alpha.9"]],
      ["^1.2.3-beta.1", ["1.2.3-beta.2", "1.2.3"], ["1.2.3-alpha", "1.3.0-rc.1"]],
      ["* || ^1.2.3-beta.1", ["1.2.3-beta.2"], ["1.2.4-beta"]]
    ]
    for (const [input, included, excluded] of cases) {
      it(input, () => {
        for (const version of included) assertTrue(check(input)(version), `${version} in ${input}`)
        for (const version of excluded) assertFalse(check(input)(version), `${version} not in ${input}`)
      })
    }

    it("includes pre-releases on request", () => {
      const options = { includePrerelease: true }
      assertTrue(check("^1.2.3", options)("1.5.0-rc.1"))
      assertTrue(check("*", options)("1.0.0-beta"))
      assertTrue(check("1.x", options)("1.0.0-0"))
      assertTrue(check(">=8.0.0-0", options)("9.0.0-alpha"))
      assertFalse(check(">=8.0.0-0")("9.0.0-alpha"))
      assertFalse(check("^1.2.3", options)("2.0.0-0"))
      assertFalse(check("^1.2.3", options)("1.2.3-rc.1"))
    })

    it("supports data-last usage", () => {
      const versions = ["1.0.0", "1.5.0", "2.0.0"].map($)
      assertTrue(pipe(range("^1.1"), SemVerRange.matches($("1.5.0"))))
      deepStrictEqual(versions.filter((version) => SemVerRange.matches(range("^1.1"), version)).map(fmt), ["1.5.0"])
      assertTrue(pipe(range("1"), SemVerRange.matches($("1.0.0-rc.1"), { includePrerelease: true })))
    })
  })

  it("maxSatisfying / minSatisfying", () => {
    const versions = ["1.2.0", "1.4.1+a", "1.4.1+b", "2.0.0", "1.5.0-rc.1", "1.1.0"].map($)
    const caret = range("^1.2.0")
    deepStrictEqual(SemVerRange.maxSatisfying(caret, versions).pipe(Option.map(fmt)), Option.some("1.4.1+a"))
    deepStrictEqual(SemVerRange.minSatisfying(caret, versions).pipe(Option.map(fmt)), Option.some("1.2.0"))
    deepStrictEqual(
      pipe(caret, SemVerRange.maxSatisfying(versions, { includePrerelease: true })).pipe(Option.map(fmt)),
      Option.some("1.5.0-rc.1")
    )
    assertTrue(Option.isNone(SemVerRange.maxSatisfying(range("^3"), versions)))
    assertTrue(Option.isNone(SemVerRange.minSatisfying(caret, [])))
  })
})
