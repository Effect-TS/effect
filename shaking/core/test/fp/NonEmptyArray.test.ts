import * as assert from "assert"

import * as C from "fp-ts/lib/Const"
import * as I from "fp-ts/lib/Identity"

import { eqNumber } from "../../src/Eq"
import { identity } from "../../src/Function"
import * as M from "../../src/Monoid"
import {
  concat,
  cons,
  copy,
  filter,
  filterWithIndex,
  fold,
  foldMap,
  foldMapWithIndex,
  fromArray,
  getEq,
  getSemigroup,
  getShow,
  group,
  groupBy,
  groupSort,
  head,
  init,
  insertAt,
  last,
  max,
  min,
  modifyAt,
  nonEmptyArray,
  NonEmptyArray,
  reverse,
  snoc,
  sort,
  tail,
  updateAt
} from "../../src/NonEmptyArray"
import { isSome, none, option, some } from "../../src/Option"
import { ordNumber } from "../../src/Ord"
import { semigroupString, semigroupSum } from "../../src/Semigroup"
import { showString } from "../../src/Show"

describe("NonEmptyArray", () => {
  it("head", () => {
    assert.deepStrictEqual(head([1, 2]), 1)
  })

  it("tail", () => {
    assert.deepStrictEqual(tail([1, 2]), [2])
  })

  it("map", () => {
    const double = (n: number) => n * 2
    assert.deepStrictEqual(nonEmptyArray.map([1, 2], double), [2, 4])
  })

  it("mapWithIndex", () => {
    const add = (i: number, n: number) => n + i
    assert.deepStrictEqual(nonEmptyArray.mapWithIndex([1, 2], add), [1, 3])
  })

  it("of", () => {
    assert.deepStrictEqual(nonEmptyArray.of(1), [1])
  })

  it("ap", () => {
    const double = (n: number) => n * 2
    assert.deepStrictEqual(nonEmptyArray.ap([double, double], [1, 2]), [2, 4, 2, 4])
  })

  it("chain", () => {
    const f = (a: number): NonEmptyArray<number> => [a, 4]
    assert.deepStrictEqual(nonEmptyArray.chain([1, 2], f), [1, 4, 2, 4])
  })

  it("extend", () => {
    const sum = fold(M.monoidSum)
    assert.deepStrictEqual(nonEmptyArray.extend([1, 2, 3, 4], sum), [10, 9, 7, 4])
  })

  it("extract", () => {
    assert.deepStrictEqual(nonEmptyArray.extract([1, 2, 3]), 1)
  })

  it("traverse", () => {
    assert.deepStrictEqual(
      nonEmptyArray.traverse(option)([1, 2, 3], (n) => (n >= 0 ? some(n) : none)),
      some([1, 2, 3])
    )
    assert.deepStrictEqual(
      nonEmptyArray.traverse(option)([1, 2, 3], (n) => (n >= 2 ? some(n) : none)),
      none
    )
  })

  it("sequence", () => {
    const sequence = nonEmptyArray.sequence(option)
    assert.deepStrictEqual(sequence([some(1), some(2), some(3)]), some([1, 2, 3]))
    assert.deepStrictEqual(sequence([none, some(2), some(3)]), none)
  })

  it("min", () => {
    assert.deepStrictEqual(min(ordNumber)([2, 1, 3]), 1)
    assert.deepStrictEqual(min(ordNumber)([3]), 3)
  })

  it("max", () => {
    assert.deepStrictEqual(max(ordNumber)([1, 2, 3]), 3)
    assert.deepStrictEqual(max(ordNumber)([1]), 1)
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      nonEmptyArray.reduce(["a", "b"], "", (b, a) => b + a),
      "ab"
    )
  })

  it("foldMap", () => {
    const foldMap = nonEmptyArray.foldMap(M.monoidString)
    assert.deepStrictEqual(foldMap(["a", "b", "c"], identity), "abc")
  })

  it("reduceRight", () => {
    const reduceRight = nonEmptyArray.reduceRight
    const init1 = ""
    const f = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(reduceRight(["a", "b", "c"], init1, f), "cba")
  })

  it("fromArray", () => {
    assert.deepStrictEqual(fromArray([]), none)
    assert.deepStrictEqual(fromArray([1]), some([1]))
    assert.deepStrictEqual(fromArray([1, 2]), some([1, 2]))
  })

  it("getSemigroup", () => {
    const S = getSemigroup<number>()
    assert.deepStrictEqual(S.concat([1], [2]), [1, 2])
    assert.deepStrictEqual(S.concat([1, 2], [3, 4]), [1, 2, 3, 4])
  })

  it("getEq", () => {
    const S = getEq(eqNumber)
    assert.deepStrictEqual(S.equals([1], [1]), true)
    assert.deepStrictEqual(S.equals([1], [1, 2]), false)
  })

  it("group", () => {
    assert.deepStrictEqual(group(ordNumber)([]), [])

    assert.deepStrictEqual(group(ordNumber)([1, 2, 1, 1]), [[1], [2], [1, 1]])

    assert.deepStrictEqual(group(ordNumber)([1, 2, 1, 1, 3]), [[1], [2], [1, 1], [3]])
  })

  it("groupSort", () => {
    assert.deepStrictEqual(groupSort(ordNumber)([]), [])
    assert.deepStrictEqual(groupSort(ordNumber)([1, 2, 1, 1]), [[1, 1, 1], [2]])
  })

  it("last", () => {
    assert.deepStrictEqual(last([1, 2, 3]), 3)
    assert.deepStrictEqual(last([1]), 1)
  })

  it("init", () => {
    assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
    assert.deepStrictEqual(init([1]), [])
  })

  it("sort", () => {
    assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
  })

  it("reverse", () => {
    assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
  })

  it("groupBy", () => {
    assert.deepStrictEqual(groupBy((_) => "")([]), {})
    assert.deepStrictEqual(groupBy(String)([1]), { "1": [1] })
    assert.deepStrictEqual(
      groupBy((s: string) => String(s.length))(["foo", "bar", "foobar"]),
      {
        "3": ["foo", "bar"],
        "6": ["foobar"]
      }
    )
  })

  it("insertAt", () => {
    const make = (x: number) => ({ x })
    const a1 = make(1)
    const a2 = make(1)
    const a3 = make(2)
    const a4 = make(3)
    assert.deepStrictEqual(insertAt(0, a4)([a1, a2, a3]), some([a4, a1, a2, a3]))
    assert.deepStrictEqual(insertAt(-1, a4)([a1, a2, a3]), none)
    assert.deepStrictEqual(insertAt(3, a4)([a1, a2, a3]), some([a1, a2, a3, a4]))
    assert.deepStrictEqual(insertAt(1, a4)([a1, a2, a3]), some([a1, a4, a2, a3]))
    assert.deepStrictEqual(insertAt(4, a4)([a1, a2, a3]), none)
  })

  it("updateAt", () => {
    const make2 = (x: number) => ({ x })
    const a1 = make2(1)
    const a2 = make2(1)
    const a3 = make2(2)
    const a4 = make2(3)
    const arr: NonEmptyArray<{ readonly x: number }> = [a1, a2, a3]
    assert.deepStrictEqual(updateAt(0, a4)(arr), some([a4, a2, a3]))
    assert.deepStrictEqual(updateAt(-1, a4)(arr), none)
    assert.deepStrictEqual(updateAt(3, a4)(arr), none)
    assert.deepStrictEqual(updateAt(1, a4)(arr), some([a1, a4, a3]))
    // should return the same reference if nothing changed
    const r1 = updateAt(0, a1)(arr)
    if (isSome(r1)) {
      assert.deepStrictEqual(r1.value, arr)
    } else {
      assert.fail("is not a Some")
    }
    const r2 = updateAt(2, a3)(arr)
    if (isSome(r2)) {
      assert.deepStrictEqual(r2.value, arr)
    } else {
      assert.fail("is not a Some")
    }
  })

  it("modifyAt", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(modifyAt(1, double)(cons(1, [])), none)
    assert.deepStrictEqual(modifyAt(1, double)(cons(1, [2])), some(cons(1, [4])))
  })

  it("copy", () => {
    const nea1 = cons(1, [])
    const nea2 = copy(nea1)
    assert.deepStrictEqual(nea2, nea1)
    assert.deepStrictEqual(nea2 === nea1, false)
  })

  it("filter", () => {
    const make = (x: number) => ({ x })
    const a1 = make(1)
    const a2 = make(1)
    const a3 = make(2)
    assert.deepStrictEqual(filter(({ x }) => x !== 1)([a1, a2, a3]), some([a3]))
    assert.deepStrictEqual(filter(({ x }) => x !== 2)([a1, a2, a3]), some([a1, a2]))
    assert.deepStrictEqual(
      filter(({ x }) => {
        return !(x === 1 || x === 2)
      })([a1, a2, a3]),
      none
    )
    assert.deepStrictEqual(
      filter(({ x }) => x !== 10)([a1, a2, a3]),
      some([a1, a2, a3])
    )

    // refinements
    const actual1 = filter(isSome)([some(3), some(2), some(1)])
    assert.deepStrictEqual(actual1, some([some(3), some(2), some(1)]))
    const actual2 = filter(isSome)([some(3), none, some(1)])
    assert.deepStrictEqual(actual2, some([some(3), some(1)]))
  })

  it("filterWithIndex", () => {
    assert.deepStrictEqual(filterWithIndex((i) => i % 2 === 0)([1, 2, 3]), some([1, 3]))
    assert.deepStrictEqual(
      filterWithIndex((i, a: number) => i % 2 === 1 && a > 2)([1, 2, 3]),
      none
    )
  })

  it("reduceWithIndex", () => {
    assert.deepStrictEqual(
      nonEmptyArray.reduceWithIndex(["a", "b"], "", (i, b, a) => b + i + a),
      "0a1b"
    )
  })

  it("foldMapWithIndex", () => {
    assert.deepStrictEqual(
      nonEmptyArray.foldMapWithIndex(M.monoidString)(["a", "b"], (i, a) => i + a),
      "0a1b"
    )
  })

  it("reduceRightWithIndex", () => {
    assert.deepStrictEqual(
      nonEmptyArray.reduceRightWithIndex(["a", "b"], "", (i, a, b) => b + i + a),
      "1b0a"
    )
  })

  it("traverseWithIndex", () => {
    assert.deepStrictEqual(
      nonEmptyArray.traverseWithIndex(option)(["a", "bb"], (i, s) =>
        s.length >= 1 ? some(s + i) : none
      ),
      some(["a0", "bb1"])
    )
    assert.deepStrictEqual(
      nonEmptyArray.traverseWithIndex(option)(["a", "bb"], (i, s) =>
        s.length > 1 ? some(s + i) : none
      ),
      none
    )

    // FoldableWithIndex compatibility
    const f = (i: number, s: string): string => s + i
    assert.deepStrictEqual(
      nonEmptyArray.foldMapWithIndex(M.monoidString)(["a", "bb"], f),
      nonEmptyArray.traverseWithIndex(C.getApplicative(M.monoidString))(
        ["a", "bb"],
        (i, a) => C.make(f(i, a))
      )
    )

    // FunctorWithIndex compatibility
    assert.deepStrictEqual(
      nonEmptyArray.mapWithIndex(["a", "bb"], f),
      nonEmptyArray.traverseWithIndex(I.identity)(["a", "bb"], (i, a) =>
        I.identity.of(f(i, a))
      )
    )
  })

  it("cons", () => {
    assert.deepStrictEqual(cons(1, [2, 3, 4]), [1, 2, 3, 4])
  })

  it("snoc", () => {
    assert.deepStrictEqual(snoc([1, 2, 3], 4), [1, 2, 3, 4])
  })

  it("getShow", () => {
    const S = getShow(showString)
    assert.deepStrictEqual(S.show(["a"]), `["a"]`)
    assert.deepStrictEqual(S.show(["a", "b", "c"]), `["a", "b", "c"]`)
  })

  it("alt / concat", () => {
    assert.deepStrictEqual(concat(["a"], []), ["a"])
    assert.deepStrictEqual(
      nonEmptyArray.alt(["a"], () => ["b"]),
      ["a", "b"]
    )
  })

  it("foldMap", () => {
    const f = foldMap(semigroupSum)((s: string) => s.length)
    assert.deepStrictEqual(f(["a"]), 1)
    assert.deepStrictEqual(f(["a", "bb"]), 3)
  })

  it("foldMapWithIndex", () => {
    const f = foldMapWithIndex(semigroupSum)((i: number, s: string) => s.length + i)
    assert.deepStrictEqual(f(["a"]), 1)
    assert.deepStrictEqual(f(["a", "bb"]), 4)
  })

  it("fold", () => {
    const f = fold(semigroupString)
    assert.deepStrictEqual(f(["a"]), "a")
    assert.deepStrictEqual(f(["a", "bb"]), "abb")
  })
})
