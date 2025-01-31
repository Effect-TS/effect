import { describe, it } from "@effect/vitest"
import { Symbol as Sym } from "effect"
import { assertFalse, assertTrue } from "effect/test/util"

describe("Symbol", () => {
  it("isSymbol", () => {
    assertTrue(Sym.isSymbol(Symbol.for("effect/test/a")))
    assertFalse(Sym.isSymbol(1n))
    assertFalse(Sym.isSymbol(1))
    assertFalse(Sym.isSymbol("a"))
    assertFalse(Sym.isSymbol(true))
  })

  it("Equivalence", () => {
    const eq = Sym.Equivalence
    assertTrue(eq(Symbol.for("effect/test/a"), Symbol.for("effect/test/a")))
    assertFalse(eq(Symbol.for("effect/test/a"), Symbol.for("effect/test/b")))
  })
})
