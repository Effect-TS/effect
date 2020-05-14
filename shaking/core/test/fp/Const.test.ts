import * as assert from "assert"

import * as C from "../../src/Const"
import { eqNumber } from "../../src/Eq"
import { monoidString } from "../../src/Monoid"
import { semigroupString } from "../../src/Semigroup"
import { showString } from "../../src/Show"

describe("Const", () => {
  it("map", () => {
    const fa = C.make("foo")
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(C.const.map(fa, double), fa)
  })

  it("contramap", () => {
    const fa: C.Const<string, number> = C.make("foo")
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(C.const.contramap(fa, double), fa)
  })

  it("bimap", () => {
    const fa: C.Const<string, number> = C.make("a")
    const f = (s: string): string => s.toUpperCase()
    const g = (n: number): number => n * 2
    assert.deepStrictEqual(C.const.bimap(fa, f, g), C.make("A"))
  })

  it("mapLeft", () => {
    const fa: C.Const<string, number> = C.make("a")
    const f = (s: string): string => s.toUpperCase()
    assert.deepStrictEqual(C.const.mapLeft(fa, f), C.make("A"))
  })

  it("getApplicative", () => {
    const F = C.getApplicative(monoidString)
    assert.deepStrictEqual(F.of(1), C.make(""))
  })

  it("getEq", () => {
    const S = C.getEq(eqNumber)
    assert.deepStrictEqual(S.equals(C.make(1), C.make(1)), true)
    assert.deepStrictEqual(S.equals(C.make(1), C.make(2)), false)
  })

  it("getApplicative", () => {
    const F = C.getApply(semigroupString)
    const fa = C.make("foo")
    assert.deepStrictEqual(F.ap(fa, C.make("bar")), C.make("foobar"))
  })

  it("getShow", () => {
    const S = C.getShow(showString)
    const x: C.Const<string, number> = C.make("a")
    assert.deepStrictEqual(S.show(x), `make("a")`)
  })
})
