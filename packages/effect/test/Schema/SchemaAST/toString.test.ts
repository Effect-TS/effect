import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("toString", () => {
  it("Struct (immutable)", () => {
    expect(S.Struct({ a: S.String, b: S.Number }).ast.toString()).toBe(`{ readonly a: string; readonly b: number }`)
  })

  it("Struct (mutable)", () => {
    expect(S.mutable(S.Struct({ a: S.String, b: S.Number })).ast.toString()).toBe(
      `{ a: string; b: number }`
    )
  })

  it("Record (immutable)", () => {
    expect(S.Record({ key: S.String, value: S.Number }).ast.toString()).toBe(`{ readonly [x: string]: number }`)
  })

  it("Record (mutable)", () => {
    expect(S.mutable(S.Record({ key: S.String, value: S.Number })).ast.toString()).toBe(
      `{ [x: string]: number }`
    )
  })

  it("Refinement", () => {
    expect(S.String.pipe(S.filter(() => true)).ast.toString()).toBe(
      `{ string | filter }`
    )
  })
})
