import * as assert from "assert"

import { getMonoid } from "../../src/Array"
import { left, right } from "../../src/Either"
import { identity } from "../../src/Function"
import { monoidString } from "../../src/Monoid"
import { none, option, some } from "../../src/Option"
import * as RT from "../../src/Readonly/Tuple"

describe("ReadonlyTuple", () => {
  it("compose", () => {
    assert.deepStrictEqual(RT.readonlyTuple.compose([true, 2], [1, "a"]), [true, "a"])
  })

  it("map", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(RT.readonlyTuple.map([1, "a"], double), [2, "a"])
  })

  it("extract", () => {
    assert.deepStrictEqual(RT.readonlyTuple.extract([1, "a"]), 1)
  })

  it("extend", () => {
    const f = (fa: readonly [number, string]): number => RT.snd(fa).length + RT.fst(fa)
    assert.deepStrictEqual(RT.readonlyTuple.extend([1, "bb"], f), [3, "bb"])
  })

  describe("Bifunctor", () => {
    it("bimap", () => {
      const double = (n: number): number => n * 2
      const len = (s: string): number => s.length
      assert.deepStrictEqual(RT.readonlyTuple.bimap([1, "a"], len, double), [2, 1])
    })

    it("mapLeft", () => {
      const len = (s: string): number => s.length
      assert.deepStrictEqual(RT.readonlyTuple.mapLeft([1, "a"], len), [1, 1])
    })
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      RT.readonlyTuple.reduce(["b", 1], "a", (acc, a) => acc + a),
      "ab"
    )
  })

  it("foldMap", () => {
    assert.deepStrictEqual(
      RT.readonlyTuple.foldMap(monoidString)(["a", 1], identity),
      "a"
    )
  })

  it("reduceRight", () => {
    assert.deepStrictEqual(
      RT.readonlyTuple.reduceRight(["b", 1], "a", (acc, a) => acc + a),
      "ba"
    )
  })

  it("swap", () => {
    assert.deepStrictEqual(RT.swap([1, "a"]), ["a", 1])
  })

  it("getApply", () => {
    const apply = RT.getApply(monoidString)
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(apply.ap([double, "a"], [1, "b"]), [2, "ab"])
  })

  it("getApplicative", () => {
    const applicative = RT.getApplicative(monoidString)
    assert.deepStrictEqual(applicative.of(1), [1, ""])
  })

  it("getMonad", () => {
    const monad = RT.getMonad(monoidString)
    assert.deepStrictEqual(
      monad.chain([1, "a"], (a) => [a * 2, "b"]),
      [2, "ab"]
    )
  })

  it("chainRec", () => {
    const { chainRec } = RT.getChainRec(getMonoid<number>())
    function seqReq(upper: number): readonly [number, ReadonlyArray<number>] {
      return chainRec(1, (init) => [
        init >= upper ? right(init) : left(init + 1),
        [init]
      ])
    }
    const xs = RT.snd(seqReq(10000))
    assert.deepStrictEqual(xs.length, 10000)
    assert.deepStrictEqual(xs[0], 1)
    assert.deepStrictEqual(xs[xs.length - 1], 10000)
  })

  it("traverse", () => {
    assert.deepStrictEqual(
      RT.readonlyTuple.traverse(option)([2, "a"], (n) => (n >= 2 ? some(n) : none)),
      some([2, "a"])
    )
    assert.deepStrictEqual(
      RT.readonlyTuple.traverse(option)([1, "a"], (n) => (n >= 2 ? some(n) : none)),
      none
    )
  })

  it("sequence", () => {
    const sequence = RT.readonlyTuple.sequence(option)
    assert.deepStrictEqual(sequence([some(2), "a"]), some([2, "a"]))
    assert.deepStrictEqual(sequence([none, "a"]), none)
  })
})
