import * as assert from "assert"

import { getMonoid } from "../../src/Array"
import { left, right } from "../../src/Either"
import { identity } from "../../src/Function"
import { pipe } from "../../src/Function"
import { monoidString } from "../../src/Monoid"
import { none, option, some } from "../../src/Option"
import * as RT from "../../src/Tuple"

describe("Tuple", () => {
  it("compose", () => {
    assert.deepStrictEqual(RT.tuple.compose([1, "a"])([true, 2]), [true, "a"])
  })

  it("map", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(RT.tuple.map(double)([1, "a"]), [2, "a"])
  })

  it("extract", () => {
    assert.deepStrictEqual(RT.tuple.extract([1, "a"]), 1)
  })

  it("extend", () => {
    const f = (fa: readonly [number, string]): number => RT.snd(fa).length + RT.fst(fa)
    assert.deepStrictEqual(RT.tuple.extend(f)([1, "bb"]), [3, "bb"])
  })

  describe("Bifunctor", () => {
    it("bimap", () => {
      const double = (n: number): number => n * 2
      const len = (s: string): number => s.length
      assert.deepStrictEqual(RT.tuple.bimap(len, double)([1, "a"]), [2, 1])
    })

    it("mapLeft", () => {
      const len = (s: string): number => s.length
      assert.deepStrictEqual(RT.tuple.mapLeft(len)([1, "a"]), [1, 1])
    })
  })

  it("reduce", () => {
    assert.deepStrictEqual(RT.tuple.reduce("a", (acc, a) => acc + a)(["b", 1]), "ab")
  })

  it("foldMap", () => {
    assert.deepStrictEqual(
      pipe(["a", 1] as const, RT.tuple.foldMap(monoidString)(identity)),
      "a"
    )
  })

  it("reduceRight", () => {
    assert.deepStrictEqual(
      RT.tuple.reduceRight("a", (acc, a) => acc + a)(["b", 1]),
      "ba"
    )
  })

  it("swap", () => {
    assert.deepStrictEqual(RT.swap([1, "a"]), ["a", 1])
  })

  it("getApply", () => {
    const apply = RT.getApply(monoidString)
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(apply.ap([1, "b"])([double, "a"]), [2, "ab"])
  })

  it("getApplicative", () => {
    const applicative = RT.getApplicative(monoidString)
    assert.deepStrictEqual(applicative.of(1), [1, ""])
  })

  it("getMonad", () => {
    const monad = RT.getMonad(monoidString)
    assert.deepStrictEqual(
      pipe(
        [1, "a"] as const,
        monad.chain((a) => [a * 2, "b"])
      ),
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
      RT.tuple.traverse(option)((n: number) => (n >= 2 ? some(n) : none))([2, "a"]),
      some([2, "a"])
    )
    assert.deepStrictEqual(
      RT.tuple.traverse(option)((n: number) => (n >= 2 ? some(n) : none))([1, "a"]),
      none
    )
  })

  it("sequence", () => {
    const sequence = RT.tuple.sequence(option)
    assert.deepStrictEqual(sequence([some(2), "a"]), some([2, "a"]))
    assert.deepStrictEqual(sequence([none, "a"]), none)
  })
})
