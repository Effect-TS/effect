import { describe, it } from "@effect/vitest"
import * as S from "effect/Symbol"
import { assertFalse, assertTrue } from "effect/test/util"

describe("Symbol", () => {
  it("isSymbol", () => {
    assertTrue(S.isSymbol(Symbol.for("effect/test/a")))
    assertFalse(S.isSymbol(1n))
    assertFalse(S.isSymbol(1))
    assertFalse(S.isSymbol("a"))
    assertFalse(S.isSymbol(true))
  })

  it("Equivalence", () => {
    const eq = S.Equivalence
    assertTrue(eq(Symbol.for("effect/test/a"), Symbol.for("effect/test/a")))
    assertFalse(eq(Symbol.for("effect/test/a"), Symbol.for("effect/test/b")))
  })
})
