import * as S from "effect/Symbol"
import { describe, expect, it } from "vitest"

describe.concurrent("Symbol", () => {
  it("isSymbol", () => {
    expect(S.isSymbol(Symbol.for("effect-test/a"))).toEqual(true)
    expect(S.isSymbol(1n)).toEqual(false)
    expect(S.isSymbol(1)).toEqual(false)
    expect(S.isSymbol("a")).toEqual(false)
    expect(S.isSymbol(true)).toEqual(false)
  })

  it("Equivalence", () => {
    const eq = S.Equivalence
    expect(eq(Symbol.for("effect-test/a"), Symbol.for("effect-test/a"))).toBe(true)
    expect(eq(Symbol.for("effect-test/a"), Symbol.for("effect-test/b"))).toBe(false)
  })
})
