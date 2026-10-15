import type { Result, SemVer as SemVerType, SemVerRange as SemVerRangeType } from "effect"
import { SemVer, SemVerRange } from "effect"
import { describe, expect, it } from "tstyche"

describe("SemVer", () => {
  it("accepts only well-formed version string literals", () => {
    expect("0.0.0").type.toBeAssignableTo<SemVerType.Input>()
    expect("1.2.3").type.toBeAssignableTo<SemVerType.Input>()
    expect("10.20.30").type.toBeAssignableTo<SemVerType.Input>()
    expect("1.0.0-rc.1").type.toBeAssignableTo<SemVerType.Input>()
    expect("1.0.0+build.5").type.toBeAssignableTo<SemVerType.Input>()
    expect("1.0.0-rc.1+build.5").type.toBeAssignableTo<SemVerType.Input>()
    expect("9007199254740993.0.0").type.toBeAssignableTo<SemVerType.Input>()
    expect("").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1.2").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("v1.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("=1.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect(" 1.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("01.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1.02.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1.2.03").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("-1.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1.2.x").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1e3.0.0").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("1.2.3.4").type.not.toBeAssignableTo<SemVerType.Input>()
    expect("^1.2.3").type.not.toBeAssignableTo<SemVerType.Input>()
    expect<string>().type.not.toBeAssignableTo<SemVerType.Input>()
  })

  it("accepts versions and components", () => {
    expect(SemVer.parseUnsafe("1.2.3")).type.toBeAssignableTo<SemVerType.Input>()
    expect({ major: 1, minor: 2, patch: 3 }).type.toBeAssignableTo<SemVerType.Input>()
    expect({ major: 1, minor: 2, patch: 3, prerelease: ["rc", 1], build: ["001"] }).type.toBeAssignableTo<
      SemVerType.Input
    >()
    expect({ major: 1, minor: 2 }).type.not.toBeAssignableTo<SemVerType.Input>()
    expect(SemVer.fromInput("1.2.3")).type.toBe<Result.Result<SemVerType.SemVer, SemVerType.SemVerError>>()
    expect(SemVer.fromInputUnsafe("1.2.3")).type.toBe<SemVerType.SemVer>()
  })
})

describe("SemVerRange", () => {
  it("accepts ranges and any string", () => {
    expect<string>().type.toBeAssignableTo<SemVerRangeType.Input>()
    expect(SemVerRange.parseUnsafe("^1.2.3")).type.toBeAssignableTo<SemVerRangeType.Input>()
    expect(SemVerRange.fromInput("^1.2.3")).type.toBe<
      Result.Result<SemVerRangeType.SemVerRange, SemVerType.SemVerError>
    >()
    expect(SemVerRange.fromInputUnsafe("^1.2.3")).type.toBe<SemVerRangeType.SemVerRange>()
  })
})
