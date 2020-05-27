import * as assert from "assert"

import { getMonoid } from "../../src/Array"
import { left, right } from "../../src/Either"
import { identity } from "../../src/Function"
import { monoidString } from "../../src/Monoid"
import { none, option, some } from "../../src/Option"
import { pipe } from "../../src/Pipe"
import * as T from "../../src/Tuple"

describe("Tuple", () => {
  it("compose", () => {
    assert.deepStrictEqual(T.tuple.compose([1, "a"])([true, 2]), [true, "a"])
  })

  it("map", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(T.tuple.map(double)([1, "a"]), [2, "a"])
  })

  it("extract", () => {
    assert.deepStrictEqual(T.tuple.extract([1, "a"]), 1)
  })

  it("extend", () => {
    // tslint:disable-next-line: readonly-array
    const f = (fa: [number, string]): number => T.snd(fa).length + T.fst(fa)
    assert.deepStrictEqual(T.tuple.extend(f)([1, "bb"]), [3, "bb"])
  })

  describe("Bifunctor", () => {
    it("bimap", () => {
      const double = (n: number): number => n * 2
      const len = (s: string): number => s.length
      assert.deepStrictEqual(T.tuple.bimap(len, double)([1, "a"]), [2, 1])
    })

    it("mapLeft", () => {
      const len = (s: string): number => s.length
      assert.deepStrictEqual(T.tuple.mapLeft(len)([1, "a"]), [1, 1])
    })
  })

  it("reduce", () => {
    assert.deepStrictEqual(T.tuple.reduce("a", (acc, a) => acc + a)(["b", 1]), "ab")
  })

  it("foldMap", () => {
    assert.deepStrictEqual(
      pipe(["a", 1] as [string, number], T.tuple.foldMap(monoidString)(identity)),
      "a"
    )
  })

  it("reduceRight", () => {
    assert.deepStrictEqual(
      T.tuple.reduceRight("a", (acc, a) => acc + a)(["b", 1]),
      "ba"
    )
  })

  it("swap", () => {
    assert.deepStrictEqual(T.swap([1, "a"]), ["a", 1])
  })

  it("getApply", () => {
    const apply = T.getApply(monoidString)
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(apply.ap([1, "b"])([double, "a"]), [2, "ab"])
  })

  it("getApplicative", () => {
    const applicative = T.getApplicative(monoidString)
    assert.deepStrictEqual(applicative.of(1), [1, ""])
  })

  it("getMonad", () => {
    const monad = T.getMonad(monoidString)
    assert.deepStrictEqual(
      pipe(
        [1, "a"] as [number, string],
        monad.chain((a) => [a * 2, "b"])
      ),
      [2, "ab"]
    )
  })

  it("chainRec", () => {
    const { chainRec } = T.getChainRec(getMonoid<number>())
    // tslint:disable-next-line: readonly-array
    function seqReq(upper: number): [number, Array<number>] {
      return chainRec(1, (init) => [
        init >= upper ? right(init) : left(init + 1),
        [init]
      ])
    }
    const xs = T.snd(seqReq(10000))
    assert.deepStrictEqual(xs.length, 10000)
    assert.deepStrictEqual(xs[0], 1)
    assert.deepStrictEqual(xs[xs.length - 1], 10000)
  })

  it("traverse", () => {
    assert.deepStrictEqual(
      pipe(
        [2, "a"] as [number, string],
        T.tuple.traverse(option)((n) => (n >= 2 ? some(n) : none))
      ),
      some([2, "a"])
    )
    assert.deepStrictEqual(
      pipe(
        [1, "a"] as [number, string],
        T.tuple.traverse(option)((n) => (n >= 2 ? some(n) : none))
      ),
      none
    )
  })

  it("sequence", () => {
    const sequence = T.tuple.sequence(option)
    assert.deepStrictEqual(sequence([some(2), "a"]), some([2, "a"]))
    assert.deepStrictEqual(sequence([none, "a"]), none)
  })
})
