import * as Flatten from "@effect/printer/Flatten"
import { describe, expect, it } from "@effect/vitest"
import { identity } from "effect/Function"

describe.concurrent("Flatten", () => {
  it("isFlattened", () => {
    expect(Flatten.isFlattened(Flatten.flattened(1))).toBe(true)
    expect(Flatten.isFlattened(Flatten.neverFlat)).toBe(false)
  })

  it("isAlreadyFlat", () => {
    expect(Flatten.isAlreadyFlat(Flatten.alreadyFlat)).toBe(true)
    expect(Flatten.isAlreadyFlat(Flatten.neverFlat)).toBe(false)
  })

  it("isNeverFlat", () => {
    expect(Flatten.isNeverFlat(Flatten.neverFlat)).toBe(true)
    expect(Flatten.isNeverFlat(Flatten.alreadyFlat)).toBe(false)
  })

  it("map", () => {
    expect(Flatten.map(Flatten.flattened(1), (n) => n + 1)).toEqual(Flatten.flattened(2))
    expect(Flatten.map(Flatten.alreadyFlat, identity)).toEqual(Flatten.alreadyFlat)
    expect(Flatten.map(Flatten.neverFlat, identity)).toEqual(Flatten.neverFlat)
  })
})
