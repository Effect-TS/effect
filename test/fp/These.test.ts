import * as assert from "assert"

import { eqNumber } from "../../src/Eq"
import { identity } from "../../src/Function"
import { pipe } from "../../src/Function"
import { monoidString, monoidSum } from "../../src/Monoid"
import { none, option, some } from "../../src/Option"
import { semigroupString } from "../../src/Semigroup"
import { showString } from "../../src/Show"
import * as _ from "../../src/These"

describe("These", () => {
  it("getEq", () => {
    const { equals } = _.getEq(eqNumber, eqNumber)
    assert.deepStrictEqual(equals(_.left(2), _.left(2)), true)
    assert.deepStrictEqual(equals(_.left(2), _.left(3)), false)
    assert.deepStrictEqual(equals(_.left(3), _.left(2)), false)
    assert.deepStrictEqual(equals(_.left(2), _.right(2)), false)
    assert.deepStrictEqual(equals(_.left(2), _.both(2, 2)), false)
    assert.deepStrictEqual(equals(_.right(2), _.right(2)), true)
    assert.deepStrictEqual(equals(_.right(2), _.right(3)), false)
    assert.deepStrictEqual(equals(_.right(3), _.right(2)), false)
    assert.deepStrictEqual(equals(_.right(2), _.both(2, 2)), false)
    assert.deepStrictEqual(equals(_.both(2, 2), _.both(2, 2)), true)
    assert.deepStrictEqual(equals(_.both(2, 3), _.both(3, 2)), false)
  })

  it("getSemigroup", () => {
    const { concat } = _.getSemigroup(monoidString, monoidSum)
    assert.deepStrictEqual(concat(_.left("a"), _.left("b")), _.left("ab"))
    assert.deepStrictEqual(concat(_.left("a"), _.right(2)), _.both("a", 2))
    assert.deepStrictEqual(concat(_.right(2), _.left("a")), _.both("a", 2))
    assert.deepStrictEqual(concat(_.left("a"), _.both("b", 2)), _.both("ab", 2))
    assert.deepStrictEqual(concat(_.both("b", 2), _.left("a")), _.both("ba", 2))
    assert.deepStrictEqual(concat(_.right(3), _.right(2)), _.right(5))
    assert.deepStrictEqual(concat(_.right(3), _.both("b", 2)), _.both("b", 5))
    assert.deepStrictEqual(concat(_.both("b", 2), _.right(3)), _.both("b", 5))
    assert.deepStrictEqual(concat(_.both("a", 3), _.both("b", 2)), _.both("ab", 5))
  })

  it("map", () => {
    const double = (n: number) => n * 2
    assert.deepStrictEqual(_.these.map(double)(_.left(2)), _.left(2))
    assert.deepStrictEqual(_.these.map(double)(_.right(2)), _.right(4))
    assert.deepStrictEqual(_.these.map(double)(_.both(1, 2)), _.both(1, 4))
  })

  it("getMonad", () => {
    const double = (n: number) => n * 2
    const F = _.getMonad(semigroupString)
    const fab = F.of(double)
    const fa = F.of(1)
    assert.deepStrictEqual(F.ap(fa)(fab), F.of(2))
  })

  it("fold", () => {
    const double = (n: number) => n * 2
    const len = (s: string) => s.length
    const f = (s: string, n: number) => len(s) + double(n)
    const fold = _.fold(len, double, f)
    assert.deepStrictEqual(fold(_.left("foo")), 3)
    assert.deepStrictEqual(fold(_.right(1)), 2)
    assert.deepStrictEqual(fold(_.both("foo", 1)), 5)
  })

  describe("Bifunctor", () => {
    it("bimap", () => {
      const len = (s: string): number => s.length
      const double = (n: number): number => n * 2
      assert.deepStrictEqual(_.these.bimap(len, double)(_.left("a")), _.left(1))
      assert.deepStrictEqual(_.these.bimap(len, double)(_.right(2)), _.right(4))
      assert.deepStrictEqual(_.these.bimap(len, double)(_.both("foo", 1)), _.both(3, 2))
    })

    it("mapLeft", () => {
      const len = (s: string): number => s.length
      assert.deepStrictEqual(_.these.mapLeft(len)(_.left("a")), _.left(1))
      assert.deepStrictEqual(_.these.mapLeft(len)(_.right(2)), _.right(2))
      assert.deepStrictEqual(_.these.mapLeft(len)(_.both("foo", 1)), _.both(3, 1))
    })
  })

  it("toTuple", () => {
    assert.deepStrictEqual(pipe(_.left("b"), _.toTuple("a", 1)), ["b", 1])
    assert.deepStrictEqual(pipe(_.right(2), _.toTuple("a", 1)), ["a", 2])
    assert.deepStrictEqual(pipe(_.both("b", 2), _.toTuple("a", 1)), ["b", 2])
  })

  it("traverse", () => {
    assert.deepStrictEqual(
      _.these.traverse(option)((n: number) => (n >= 2 ? some(n) : none))(_.left("a")),
      some(_.left("a"))
    )
    assert.deepStrictEqual(
      _.these.traverse(option)((n: number) => (n >= 2 ? some(n) : none))(_.right(2)),
      some(_.right(2))
    )
    assert.deepStrictEqual(
      _.these.traverse(option)((n: number) => (n >= 2 ? some(n) : none))(_.right(1)),
      none
    )
    assert.deepStrictEqual(
      _.these.traverse(option)((n: number) => (n >= 2 ? some(n) : none))(
        _.both("a", 2)
      ),
      some(_.both("a", 2))
    )
    assert.deepStrictEqual(
      _.these.traverse(option)((n: number) => (n >= 2 ? some(n) : none))(
        _.both("a", 1)
      ),
      none
    )
  })

  it("sequence", () => {
    const sequence = _.these.sequence(option)
    const x1 = _.left("a")
    assert.deepStrictEqual(sequence(x1), some(_.left("a")))
    const x2 = _.right(some(1))
    assert.deepStrictEqual(sequence(x2), some(_.right(1)))
    const x3 = _.right(none)
    assert.deepStrictEqual(sequence(x3), none)
    const x4 = _.both("a", some(1))
    assert.deepStrictEqual(sequence(x4), some(_.both("a", 1)))
    const x5 = _.both("a", none)
    assert.deepStrictEqual(sequence(x5), none)
  })

  it("chain", () => {
    const M = _.getMonad(monoidString)
    const f = (n: number) =>
      n >= 2 ? (n <= 5 ? _.right(n * 2) : _.both("bar", n)) : _.left("bar")
    assert.deepStrictEqual(M.chain(f)(_.left("foo")), _.left("foo"))
    assert.deepStrictEqual(M.chain(f)(_.right(2)), _.right(4))
    assert.deepStrictEqual(M.chain(f)(_.right(1)), _.left("bar"))
    assert.deepStrictEqual(M.chain(f)(_.right(6)), _.both("bar", 6))
    assert.deepStrictEqual(M.chain(f)(_.both("foo", 2)), _.both("foo", 4))
    assert.deepStrictEqual(M.chain(f)(_.both("foo", 1)), _.left("foobar"))
    assert.deepStrictEqual(M.chain(f)(_.both("foo", 6)), _.both("foobar", 6))
  })

  it("getLeft", () => {
    assert.deepStrictEqual(_.getLeft(_.left("a")), some("a"))
    assert.deepStrictEqual(_.getLeft(_.right(1)), none)
    assert.deepStrictEqual(_.getLeft(_.both("a", 1)), some("a"))
  })

  it("getRight", () => {
    assert.deepStrictEqual(_.getRight(_.left("a")), none)
    assert.deepStrictEqual(_.getRight(_.right(1)), some(1))
    assert.deepStrictEqual(_.getRight(_.both("a", 1)), some(1))
  })

  it("leftOrBoth", () => {
    assert.deepStrictEqual(_.leftOrBoth("a")(none), _.left("a"))
    assert.deepStrictEqual(_.leftOrBoth("a")(some(1)), _.both("a", 1))
  })

  it("rightOrBoth", () => {
    assert.deepStrictEqual(_.rightOrBoth(1)(none), _.right(1))
    assert.deepStrictEqual(_.rightOrBoth(1)(some("a")), _.both("a", 1))
  })

  it("getLeftOnly", () => {
    assert.deepStrictEqual(_.getLeftOnly(_.left("a")), some("a"))
    assert.deepStrictEqual(_.getLeftOnly(_.right(1)), none)
    assert.deepStrictEqual(_.getLeftOnly(_.both("a", 1)), none)
  })

  it("getRightOnly", () => {
    assert.deepStrictEqual(_.getRightOnly(_.left("a")), none)
    assert.deepStrictEqual(_.getRightOnly(_.right(1)), some(1))
    assert.deepStrictEqual(_.getRightOnly(_.both("a", 1)), none)
  })

  it("fromOptions", () => {
    assert.deepStrictEqual(_.fromOptions(none, none), none)
    assert.deepStrictEqual(_.fromOptions(some("a"), none), some(_.left("a")))
    assert.deepStrictEqual(_.fromOptions(none, some(1)), some(_.right(1)))
    assert.deepStrictEqual(_.fromOptions(some("a"), some(1)), some(_.both("a", 1)))
  })

  it("isLeft", () => {
    assert.deepStrictEqual(_.isLeft(_.left(1)), true)
    assert.deepStrictEqual(_.isLeft(_.right(1)), false)
    assert.deepStrictEqual(_.isLeft(_.both("1", 1)), false)
  })

  it("isRight", () => {
    assert.deepStrictEqual(_.isRight(_.left(1)), false)
    assert.deepStrictEqual(_.isRight(_.right(1)), true)
    assert.deepStrictEqual(_.isRight(_.both("1", 1)), false)
  })

  it("isBoth", () => {
    assert.deepStrictEqual(_.isBoth(_.left(1)), false)
    assert.deepStrictEqual(_.isBoth(_.right(1)), false)
    assert.deepStrictEqual(_.isBoth(_.both("1", 1)), true)
  })

  it("reduce", () => {
    assert.deepStrictEqual(_.these.reduce("a", (b, a) => b + a)(_.left("b")), "a")
    assert.deepStrictEqual(_.these.reduce("a", (b, a) => b + a)(_.right("b")), "ab")
    assert.deepStrictEqual(_.these.reduce("a", (b, a) => b + a)(_.both(1, "b")), "ab")
  })

  it("foldMap", () => {
    const foldMap = _.these.foldMap(monoidString)
    const x1 = _.right("a")
    const f1 = identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "a")
    const x2 = _.left(1)
    assert.deepStrictEqual(pipe(x2, foldMap(f1)), "")
    const x3 = _.both(1, "a")
    assert.deepStrictEqual(pipe(x3, foldMap(f1)), "a")
  })

  it("reduceRight", () => {
    const reduceRight = _.these.reduceRight
    const x1 = _.right("a")
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "a")
    const x2 = _.left(1)
    assert.deepStrictEqual(pipe(x2, reduceRight(init1, f1)), "")
    const x3 = _.both(1, "a")
    assert.deepStrictEqual(pipe(x3, reduceRight(init1, f1)), "a")
  })

  it("getShow", () => {
    const S = _.getShow(showString, showString)
    assert.deepStrictEqual(S.show(_.left("a")), `left("a")`)
    assert.deepStrictEqual(S.show(_.right("a")), `right("a")`)
    assert.deepStrictEqual(S.show(_.both("a", "b")), `both("a", "b")`)
  })

  it("swap", () => {
    assert.deepStrictEqual(_.swap(_.left("a")), _.right("a"))
    assert.deepStrictEqual(_.swap(_.right("a")), _.left("a"))
    assert.deepStrictEqual(_.swap(_.both("a", 1)), _.both(1, "a"))
  })
})
