import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { Arbitrary, Array, Effect, Equal, Hash, HashSet, Option, pipe, Result, Schema, SemVer } from "effect"

const $ = SemVer.parseUnsafe
const fmt = SemVer.format

const semver = Arbitrary.schema(Schema.SemVer)

// The regular expression suggested by https://semver.org/spec/v2.0.0.html, used
// as an independent oracle for generated versions.
const officialPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const checkProperty = <A>(arbitrary: Arbitrary.Arbitrary<A>, property: (value: A) => boolean) =>
  Effect.gen(function*() {
    const failure = Arbitrary.formatCheckFailure(yield* Arbitrary.checkEffect(arbitrary, property))
    if (failure !== undefined) assert.fail(failure)
  })

describe("SemVer", () => {
  describe("parse", () => {
    it("accepts strict SemVer 2.0.0 strings", () => {
      for (
        const input of [
          "0.0.0",
          "1.2.3",
          "10.20.30",
          "1.0.0-alpha",
          "1.0.0-alpha.1",
          "1.0.0-0.3.7",
          "1.0.0-x.7.z.92",
          "1.0.0-x-y-z.--",
          "1.0.0-0a",
          "1.0.0-alpha+001",
          "1.0.0+20130313144700",
          "1.0.0-beta+exp.sha.5114f85",
          "1.0.0+21AF26D3----117B344092BD",
          `${Number.MAX_SAFE_INTEGER}.0.0`
        ]
      ) {
        strictEqual(fmt($(input)), input)
      }
    })

    it("reads components and normalizes numeric pre-release identifiers", () => {
      const version = $("1.2.3-rc.10.0a+001.exp")
      strictEqual(version.major, 1)
      strictEqual(version.minor, 2)
      strictEqual(version.patch, 3)
      deepStrictEqual(version.prerelease, ["rc", 10, "0a"])
      deepStrictEqual(version.build, ["001", "exp"])
      deepStrictEqual($("1.2.3").prerelease, [])
      deepStrictEqual($("1.2.3").build, [])
    })

    it("rejects input outside the spec grammar", () => {
      for (
        const input of [
          "",
          "1",
          "1.2",
          "1.2.3.4",
          "v1.2.3",
          "=1.2.3",
          " 1.2.3",
          "1.2.3 ",
          "01.2.3",
          "1.02.3",
          "1.2.03",
          "-1.2.3",
          "1.2.3-",
          "1.2.3+",
          "1.2.3-01",
          "1.2.3-a..b",
          "1.2.3+a..b",
          "1.2.3+a+b",
          "1.2.3-α",
          "1.2.3+_",
          "1.2.x",
          `${Number.MAX_SAFE_INTEGER + 1}.0.0`,
          `1.2.3-${Number.MAX_SAFE_INTEGER + 1}`
        ]
      ) {
        assertTrue(Result.isFailure(SemVer.parse(input)), input)
      }
    })

    it("fails with a SemVerError describing the input", () => {
      const result = SemVer.parse("1.02.3")
      if (Result.isSuccess(result)) throw new Error("expected failure")
      strictEqual(result.failure._tag, "SemVerError")
      strictEqual(result.failure.input, "1.02.3")
      strictEqual(
        result.failure.message,
        `Invalid SemVer "1.02.3": minor must be a non-negative integer without leading zeros, received "02"`
      )
      throws(() => $("1.2"))
    })

    it.effect("Schema.SemVer generates spec-valid versions", () =>
      checkProperty(semver, (version) => officialPattern.test(fmt(version))))

    it.effect("round-trips formatted versions", () =>
      checkProperty(semver, (version) => Equal.equals($(fmt(version)), version)))
  })

  describe("fromInput", () => {
    it("accepts versions, strings, and components", () => {
      const version = $("1.2.3-rc.1+b")
      deepStrictEqual(SemVer.fromInput(version), Result.succeed(version))
      strictEqual(SemVer.fromInputUnsafe(version), version)
      assertTrue(Equal.equals(SemVer.fromInputUnsafe("1.2.3-rc.1+b"), version))
      assertTrue(
        Equal.equals(SemVer.fromInputUnsafe({ major: 1, minor: 2, patch: 3, prerelease: ["rc", 1] }), $("1.2.3-rc.1"))
      )
    })

    it("fails with SemVerError for invalid input", () => {
      for (const input of ["1.2.3-", "1.2.3+a+b", { major: -1, minor: 0, patch: 0 }] as const) {
        const result = SemVer.fromInput(input)
        assertTrue(Result.isFailure(result) && SemVer.isSemVerError(result.failure))
        throws(() => SemVer.fromInputUnsafe(input))
      }
      const result = SemVer.fromInput("1.2.3-01")
      assertTrue(Result.isFailure(result) && result.failure.input === "1.2.3-01")
    })
  })

  describe("make", () => {
    it("validates and normalizes components", () => {
      const version = SemVer.make({ major: 1, minor: 0, patch: 0, prerelease: ["beta", "2"], build: ["001"] })
      deepStrictEqual(version.prerelease, ["beta", 2])
      strictEqual(fmt(version), "1.0.0-beta.2+001")
      assertTrue(Equal.equals(version, $("1.0.0-beta.2+001")))
    })

    it("derives versions from spread components", () => {
      const version = $("1.2.3-rc.1+b")
      strictEqual(fmt(SemVer.make({ ...version, patch: version.patch + 1, prerelease: [] })), "1.2.4+b")
      strictEqual(fmt(SemVer.make(version)), "1.2.3-rc.1+b")
      const max = $(`${Number.MAX_SAFE_INTEGER}.0.0`)
      throws(() => SemVer.make({ ...max, major: max.major + 1 }))
    })

    it("throws SemVerError for invalid components", () => {
      for (
        const components of [
          { major: -1, minor: 0, patch: 0 },
          { major: 1.5, minor: 0, patch: 0 },
          { major: 0, minor: Number.NaN, patch: 0 },
          { major: 0, minor: 0, patch: Number.MAX_SAFE_INTEGER + 1 },
          { major: 0, minor: 0, patch: 0, prerelease: [""] },
          { major: 0, minor: 0, patch: 0, prerelease: ["01"] },
          { major: 0, minor: 0, patch: 0, prerelease: [-1] },
          { major: 0, minor: 0, patch: 0, prerelease: ["a.b"] },
          { major: 0, minor: 0, patch: 0, build: [""] },
          { major: 0, minor: 0, patch: 0, build: ["a+b"] }
        ]
      ) {
        throws(() => SemVer.make(components), (error) => {
          assertTrue(error instanceof SemVer.SemVerError)
        })
      }
    })
  })

  it("isSemVer", () => {
    assertTrue(SemVer.isSemVer($("1.2.3")))
    assertFalse(SemVer.isSemVer("1.2.3"))
    assertFalse(SemVer.isSemVer({ major: 1, minor: 2, patch: 3, prerelease: [], build: [] }))
  })

  it("isPrerelease", () => {
    assertTrue(SemVer.isPrerelease($("1.2.3-0")))
    assertFalse(SemVer.isPrerelease($("1.2.3+build")))
  })

  it("hasBuild", () => {
    assertTrue(SemVer.hasBuild($("1.2.3+build")))
    assertFalse(SemVer.hasBuild($("1.2.3-0")))
  })

  it("isInitialDevelopment", () => {
    assertTrue(SemVer.isInitialDevelopment($("0.9.9")))
    assertTrue(SemVer.isInitialDevelopment($("0.0.0-rc.1")))
    assertFalse(SemVer.isInitialDevelopment($("1.0.0-rc.1")))
  })

  it("isSemVerError", () => {
    const result = SemVer.parse("v1")
    assertTrue(Result.isFailure(result) && SemVer.isSemVerError(result.failure))
    throws(() => SemVer.make({ major: -1, minor: 0, patch: 0 }), (error) => {
      assertTrue(SemVer.isSemVerError(error))
    })
    assertFalse(SemVer.isSemVerError(new Error("v1")))
    assertFalse(SemVer.isSemVerError({ _tag: "SemVerError", message: "v1" }))
  })

  describe("Order", () => {
    it("follows the spec precedence chain", () => {
      const chain = [
        "1.0.0-alpha",
        "1.0.0-alpha.1",
        "1.0.0-alpha.beta",
        "1.0.0-beta",
        "1.0.0-beta.2",
        "1.0.0-beta.11",
        "1.0.0-rc.1",
        "1.0.0",
        "1.0.1",
        "1.1.0",
        "2.0.0",
        "2.1.0",
        "2.1.1",
        "10.0.0"
      ].map($)
      for (let i = 0; i < chain.length; i++) {
        for (let j = 0; j < chain.length; j++) {
          strictEqual(SemVer.Order(chain[i], chain[j]), i < j ? -1 : i > j ? 1 : 0, `${chain[i]} vs ${chain[j]}`)
        }
      }
    })

    it("orders numeric identifiers numerically and before alphanumeric ones", () => {
      strictEqual(SemVer.Order($("1.0.0-2"), $("1.0.0-10")), -1)
      strictEqual(SemVer.Order($("1.0.0-10"), $("1.0.0-0a")), -1)
      strictEqual(SemVer.Order($("1.0.0-Z"), $("1.0.0-a")), -1)
    })

    it("ignores build metadata", () => {
      strictEqual(SemVer.Order($("1.0.0+a"), $("1.0.0+b")), 0)
      assertTrue(SemVer.between($("1.0.0+z"), { minimum: $("1.0.0"), maximum: $("1.0.0") }))
    })

    it.effect("is a total preorder", () =>
      checkProperty(
        Arbitrary.all([semver, semver, semver]),
        ([a, b, c]) =>
          SemVer.Order(a, b) + SemVer.Order(b, a) === 0 &&
          (SemVer.Order(a, b) > 0 || SemVer.Order(b, c) > 0 || SemVer.Order(a, c) <= 0)
      ))

    it("derives comparison helpers", () => {
      const v1 = $("1.0.0")
      const v2 = $("2.0.0-rc.1")
      assertTrue(SemVer.isLessThan(v1, v2))
      assertTrue(pipe(v2, SemVer.isGreaterThan(v1)))
      assertTrue(SemVer.isLessThanOrEqualTo(v1, $("1.0.0+build")))
      assertTrue(SemVer.isGreaterThanOrEqualTo(v2, v2))
      strictEqual(SemVer.min(v1, v2), v1)
      strictEqual(SemVer.max(v1, v2), v2)
      strictEqual(fmt(SemVer.clamp($("3.0.0"), { minimum: v1, maximum: v2 })), "2.0.0-rc.1")
      deepStrictEqual(Array.sort([v2, v1], SemVer.Order), [v1, v2])
    })
  })

  describe("equality", () => {
    it("includes build metadata", () => {
      assertTrue(Equal.equals($("1.0.0-rc.1+a"), $("1.0.0-rc.1+a")))
      assertFalse(Equal.equals($("1.0.0+a"), $("1.0.0+b")))
      assertFalse(Equal.equals($("1.0.0+a"), $("1.0.0")))
      assertFalse(SemVer.Equivalence($("1.0.0-1"), $("1.0.0-01a")))
      assertTrue(SemVer.equals($("1.0.0+a"))($("1.0.0+a")))
      strictEqual(HashSet.size(HashSet.make($("1.0.0+linux"), $("1.0.0+darwin"), $("1.0.0+linux"))), 2)
    })

    it.effect("hashes consistently with Equal", () =>
      checkProperty(semver, (version) => Hash.hash(version) === Hash.hash($(fmt(version)))))
  })

  it("formats for display", () => {
    const version = $("1.2.3-rc.1+build")
    strictEqual(String(version), "SemVer(1.2.3-rc.1+build)")
    deepStrictEqual(version.toJSON(), { _id: "SemVer", value: "1.2.3-rc.1+build" })
  })

  describe("transforms", () => {
    it("withPrerelease", () => {
      strictEqual(fmt(SemVer.withPrerelease($("1.2.3+b"), ["rc", "1"])), "1.2.3-rc.1+b")
      deepStrictEqual(pipe($("1.2.3-a"), SemVer.withPrerelease(["rc", "1"])).prerelease, ["rc", 1])
      strictEqual(fmt(SemVer.withPrerelease($("1.2.3-a+b"), [])), "1.2.3+b")
      throws(() => SemVer.withPrerelease($("1.2.3"), ["01"]))
    })

    it("withBuild", () => {
      strictEqual(fmt(SemVer.withBuild($("1.2.3-a"), ["001", "sha"])), "1.2.3-a+001.sha")
      strictEqual(fmt(pipe($("1.2.3-a+b"), SemVer.withBuild([]))), "1.2.3-a")
      throws(() => SemVer.withBuild($("1.2.3"), ["a.b"]))
    })

    it("release", () => {
      strictEqual(fmt(SemVer.release($("1.2.3-rc.1+b"))), "1.2.3")
      const final = $("1.2.3")
      strictEqual(SemVer.release(final), final)
    })
  })

  describe("bumps", () => {
    const cases: ReadonlyArray<readonly [string, (self: SemVer.SemVer) => SemVer.SemVer, string]> = [
      ["1.2.3", SemVer.bumpMajor, "2.0.0"],
      ["1.2.3+b", SemVer.bumpMajor, "2.0.0"],
      ["2.0.0-rc.1", SemVer.bumpMajor, "2.0.0"],
      ["2.1.0-rc.1", SemVer.bumpMajor, "3.0.0"],
      ["2.0.1-rc.1", SemVer.bumpMajor, "3.0.0"],
      ["1.2.3", SemVer.bumpMinor, "1.3.0"],
      ["1.2.0-a", SemVer.bumpMinor, "1.2.0"],
      ["1.2.3-a", SemVer.bumpMinor, "1.3.0"],
      ["1.2.3", SemVer.bumpPatch, "1.2.4"],
      ["1.2.3-a+b", SemVer.bumpPatch, "1.2.3"],
      ["1.2.3+b", SemVer.bumpPatch, "1.2.4"],
      ["1.2.3", SemVer.bumpPremajor, "2.0.0-0"],
      ["1.2.3-a", SemVer.bumpPremajor("beta"), "2.0.0-beta.0"],
      ["1.2.3", SemVer.bumpPreminor, "1.3.0-0"],
      ["1.2.3+b", SemVer.bumpPreminor("rc"), "1.3.0-rc.0"],
      ["1.2.3", SemVer.bumpPrepatch, "1.2.4-0"],
      ["1.2.3-a", SemVer.bumpPrepatch("alpha"), "1.2.4-alpha.0"],
      ["1.2.3", SemVer.bumpPrerelease, "1.2.4-0"],
      ["1.2.3", SemVer.bumpPrerelease("alpha"), "1.2.4-alpha.0"],
      ["1.2.4-0", SemVer.bumpPrerelease, "1.2.4-1"],
      ["1.2.4-alpha.0+b", SemVer.bumpPrerelease, "1.2.4-alpha.1"],
      ["1.2.4-alpha.0", SemVer.bumpPrerelease("alpha"), "1.2.4-alpha.1"],
      ["1.2.4-alpha", SemVer.bumpPrerelease("alpha"), "1.2.4-alpha.0"],
      ["1.2.4-alpha.beta", SemVer.bumpPrerelease("alpha"), "1.2.4-alpha.beta.0"],
      ["1.2.4-alpha.1.beta", SemVer.bumpPrerelease, "1.2.4-alpha.2.beta"],
      ["1.2.4-alpha.3", SemVer.bumpPrerelease("beta"), "1.2.4-beta.0"],
      ["1.2.4-beta.3", SemVer.bumpPrerelease("alpha"), "1.2.4-alpha.0"]
    ]
    for (const [input, bump, expected] of cases) {
      it(`${input} -> ${expected}`, () => {
        strictEqual(fmt(bump($(input))), expected)
      })
    }

    it("bump dispatches by release type", () => {
      const version = $("1.2.3-rc.1+b")
      const cases: ReadonlyArray<readonly [SemVer.ReleaseType, string, string]> = [
        ["major", "2.0.0", "2.0.0"],
        ["minor", "1.3.0", "1.3.0"],
        ["patch", "1.2.3", "1.2.3"],
        ["premajor", "2.0.0-0", "2.0.0-beta.0"],
        ["preminor", "1.3.0-0", "1.3.0-beta.0"],
        ["prepatch", "1.2.4-0", "1.2.4-beta.0"],
        ["prerelease", "1.2.3-rc.2", "1.2.3-beta.0"]
      ]
      for (const [releaseType, expected, withIdentifier] of cases) {
        strictEqual(fmt(SemVer.bump(version, releaseType)), expected, releaseType)
        strictEqual(fmt(pipe(version, SemVer.bump(releaseType, "beta"))), withIdentifier, releaseType)
      }
    })

    it("accepts data-first identifiers", () => {
      strictEqual(fmt(SemVer.bumpPremajor($("1.2.3"), "rc")), "2.0.0-rc.0")
      strictEqual(fmt(SemVer.bumpPrerelease($("1.2.3"), "rc")), "1.2.4-rc.0")
    })

    it.effect("returns higher precedence when continuing the same pre-release", () =>
      checkProperty(
        semver,
        (version) =>
          [SemVer.bumpMajor, SemVer.bumpMinor, SemVer.bumpPatch, SemVer.bumpPrerelease].every((bump) =>
            SemVer.isGreaterThan(bump(version), version)
          )
      ))

    it("throws instead of exceeding Number.MAX_SAFE_INTEGER", () => {
      const max = Number.MAX_SAFE_INTEGER
      throws(() => SemVer.bumpMajor($(`${max}.0.0`)))
      throws(() => SemVer.bumpMinor($(`0.${max}.0`)))
      throws(() => SemVer.bumpPatch($(`0.0.${max}`)))
      throws(() => SemVer.bumpPrerelease($(`0.0.0-${max}`)))
      strictEqual(fmt(SemVer.bumpMajor($(`${max}.0.0-rc`))), `${max}.0.0`)
    })

    it("rejects invalid identifiers", () => {
      throws(() => SemVer.bumpPrerelease($("1.2.3"), "a.b"))
      throws(() => SemVer.bumpPrepatch($("1.2.3"), ""))
    })
  })
})

describe("SemVer.difference", () => {
  // node-semver's `diff` test table (test/functions/diff.js at 7.8.5)
  const cases: ReadonlyArray<readonly [string, string, SemVer.ReleaseType | null]> = [
    ["1.2.3", "0.2.3", "major"],
    ["0.2.3", "1.2.3", "major"],
    ["1.4.5", "0.2.3", "major"],
    ["1.2.3", "2.0.0-pre", "premajor"],
    ["2.0.0-pre", "1.2.3", "premajor"],
    ["1.2.3", "1.3.3", "minor"],
    ["1.0.1", "1.1.0-pre", "preminor"],
    ["1.2.3", "1.2.4", "patch"],
    ["1.2.3", "1.2.4-pre", "prepatch"],
    ["0.0.1", "0.0.1-pre", "patch"],
    ["0.0.1", "0.0.1-pre-2", "patch"],
    ["1.1.0", "1.1.0-pre", "minor"],
    ["1.1.0-pre-1", "1.1.0-pre-2", "prerelease"],
    ["1.0.0", "1.0.0", null],
    ["1.0.0-1", "1.0.0-1", null],
    ["0.0.2-1", "0.0.2", "patch"],
    ["0.0.2-1", "0.0.3", "patch"],
    ["0.0.2-1", "0.1.0", "minor"],
    ["0.0.2-1", "1.0.0", "major"],
    ["0.1.0-1", "0.1.0", "minor"],
    ["1.0.0-1", "1.0.0", "major"],
    ["1.0.0-1", "1.1.1", "major"],
    ["1.0.0-1", "2.1.1", "major"],
    ["1.0.1-1", "1.0.1", "patch"],
    ["0.0.0-1", "0.0.0", "major"],
    ["1.0.0-1", "2.0.0", "major"],
    ["1.0.0-1", "2.0.0-1", "premajor"],
    ["1.0.0-1", "1.1.0-1", "preminor"],
    ["1.0.0-1", "1.0.1-1", "prepatch"],
    ["1.7.2-1", "1.8.1", "minor"],
    ["1.1.1-pre", "2.1.1-pre", "premajor"],
    ["1.1.1-pre", "2.1.1", "major"],
    ["1.2.3-1", "1.2.3", "patch"],
    ["1.4.0-1", "2.3.5", "major"],
    ["1.6.1-5", "1.7.2", "minor"],
    ["2.0.0-1", "2.1.1", "major"],
    ["1.2.3+a", "1.2.3+b", null]
  ]
  for (const [self, that, expected] of cases) {
    it(`${self} vs ${that}`, () => {
      deepStrictEqual(SemVer.difference($(self), $(that)), Option.fromNullOr(expected))
    })
  }

  it("supports data-last usage", () => {
    deepStrictEqual(pipe($("1.2.3"), SemVer.difference($("1.3.0"))), Option.some("minor"))
  })

  it.effect("names a bump that reproduces any bumped version", () => {
    const releaseTypes: ReadonlyArray<SemVer.ReleaseType> = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ]
    return checkProperty(semver, (version) =>
      releaseTypes.every((releaseType) => {
        const bumped = SemVer.bump(version, releaseType)
        const difference = Option.getOrThrow(SemVer.difference(version, bumped))
        return Equal.equals(SemVer.bump(version, difference), bumped)
      }))
  })
})
