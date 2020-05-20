import * as assert from "assert"
import { isDeepStrictEqual } from "util"

import * as fc from "fast-check"

import {
  array,
  cons,
  copy,
  deleteAt,
  dropLeft,
  dropLeftWhile,
  findFirst,
  findIndex,
  findLast,
  flatten,
  foldLeft,
  getMonoid,
  getOrd,
  head,
  init,
  insertAt,
  isEmpty,
  last,
  lefts,
  modifyAt,
  rights,
  rotate,
  scanLeft,
  scanRight,
  snoc,
  sort,
  sortBy,
  spanLeft,
  tail,
  takeLeft,
  takeLeftWhile,
  uniq,
  updateAt,
  zip,
  unzip,
  foldRight,
  chop,
  chunksOf,
  splitAt,
  takeRight,
  dropRight,
  range,
  makeBy,
  replicate,
  findLastIndex,
  zipWith,
  comprehension,
  union,
  intersection,
  difference,
  unsafeUpdateAt,
  findFirstMap,
  findLastMap,
  getShow,
  reverse,
  getEq,
  isNonEmpty
} from "../../src/Array"
import * as C from "../../src/Const"
import { left, right } from "../../src/Either"
import { eq, eqBoolean, eqNumber, eqString, Eq } from "../../src/Eq"
import { identity, tuple, Predicate } from "../../src/Function"
import * as I from "../../src/Identity"
import { fold as foldMonoid, monoidSum, monoidString } from "../../src/Monoid"
import * as O from "../../src/Option"
import { ord, ordNumber, ordString } from "../../src/Ord"
import { pipe } from "../../src/Pipe"
import { showString } from "../../src/Show"

// tslint:disable:readonly-array

const p = (n: number) => n > 2

describe("Array", () => {
  const as = [1, 2, 3]

  it("alt", () => {
    assert.deepStrictEqual(array.alt(() => [3, 4])([1, 2]), [1, 2, 3, 4])
  })

  it("getMonoid", () => {
    const M = getMonoid<number>()
    assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(M.concat([1, 2], M.empty), [1, 2])
    assert.deepStrictEqual(M.concat(M.empty, [1, 2]), [1, 2])
  })

  it("getEq", () => {
    const O = getEq(ordString)
    assert.deepStrictEqual(O.equals([], []), true, "[] ]")
    assert.deepStrictEqual(O.equals(["a"], ["a"]), true, "[a], [a]")
    assert.deepStrictEqual(O.equals(["a", "b"], ["a", "b"]), true, "[a, b], [a, b]")
    assert.deepStrictEqual(O.equals(["a"], []), false, "[a] []")
    assert.deepStrictEqual(O.equals([], ["a"]), false, "[], [a]")
    assert.deepStrictEqual(O.equals(["a"], ["b"]), false, "[a], [b]")
    assert.deepStrictEqual(O.equals(["a", "b"], ["b", "a"]), false, "[a, b], [b, a]")
    assert.deepStrictEqual(O.equals(["a", "a"], ["a"]), false, "[a, a], [a]")
  })

  it("getOrd", () => {
    const O = getOrd(ordString)
    assert.deepStrictEqual(O.compare([], []), 0, "[] ]")
    assert.deepStrictEqual(O.compare(["a"], ["a"]), 0, "[a], [a]")

    assert.deepStrictEqual(O.compare(["b"], ["a"]), 1, "[b], [a]")
    assert.deepStrictEqual(O.compare(["a"], ["b"]), -1, "[a], [b]")

    assert.deepStrictEqual(O.compare(["a"], []), 1, "[a] []")
    assert.deepStrictEqual(O.compare([], ["a"]), -1, "[], [a]")
    assert.deepStrictEqual(O.compare(["a", "a"], ["a"]), 1, "[a, a], [a]")
    assert.deepStrictEqual(O.compare(["a", "a"], ["b"]), -1, "[a, a], [a]")

    assert.deepStrictEqual(O.compare(["a", "a"], ["a", "a"]), 0, "[a, a], [a, a]")
    assert.deepStrictEqual(O.compare(["a", "b"], ["a", "b"]), 0, "[a, b], [a, b]")

    assert.deepStrictEqual(O.compare(["a", "a"], ["a", "b"]), -1, "[a, a], [a, b]")
    assert.deepStrictEqual(O.compare(["a", "b"], ["a", "a"]), 1, "[a, b], [a, a]")

    assert.deepStrictEqual(O.compare(["a", "b"], ["b", "a"]), -1, "[a, b], [b, a]")
    assert.deepStrictEqual(O.compare(["b", "a"], ["a", "a"]), 1, "[b, a], [a, a]")
    assert.deepStrictEqual(O.compare(["b", "a"], ["a", "b"]), 1, "[b, b], [a, a]")
    assert.deepStrictEqual(O.compare(["b", "b"], ["b", "a"]), 1, "[b, b], [b, a]")
    assert.deepStrictEqual(O.compare(["b", "a"], ["b", "b"]), -1, "[b, a], [b, b]")
  })

  it("ap", () => {
    const as = array.ap([1, 2, 3])([(x) => x * 2, (x) => x * 3])
    assert.deepStrictEqual(as, [2, 4, 6, 3, 6, 9])
  })

  it("traverse", () => {
    const tfanone = [1, 2]
    const f = (n: number): O.Option<number> => (n % 2 === 0 ? O.none : O.some(n))
    const fasnone = array.traverse(O.option)(f)(tfanone)
    assert.deepStrictEqual(O.isNone(fasnone), true)
    const tfa = [1, 3]
    const fas = array.traverse(O.option)(f)(tfa)
    assert.deepStrictEqual(fas, O.some([1, 3]))
  })

  it("sequence", () => {
    assert.deepStrictEqual(
      array.sequence(O.option)([O.some(1), O.some(3)]),
      O.some([1, 3])
    )
    assert.deepStrictEqual(array.sequence(O.option)([O.some(1), O.none]), O.none)
  })

  it("unfold", () => {
    const as = array.unfold(5, (n) => (n > 0 ? O.some([n, n - 1]) : O.none))
    assert.deepStrictEqual(as, [5, 4, 3, 2, 1])
  })

  it("isEmpty", () => {
    assert.deepStrictEqual(isEmpty(as), false)
    assert.deepStrictEqual(isEmpty([]), true)
  })

  it("isNotEmpty", () => {
    assert.deepStrictEqual(isNonEmpty(as), true)
    assert.deepStrictEqual(isNonEmpty([]), false)
  })

  it("cons", () => {
    assert.deepStrictEqual(cons(0, as), [0, 1, 2, 3])
    assert.deepStrictEqual(cons([1], [[2]]), [[1], [2]])
  })

  it("snoc", () => {
    assert.deepStrictEqual(snoc(as, 4), [1, 2, 3, 4])
    assert.deepStrictEqual(snoc([[1]], [2]), [[1], [2]])
  })

  it("head", () => {
    assert.deepStrictEqual(head(as), O.some(1))
    assert.deepStrictEqual(head([]), O.none)
  })

  it("last", () => {
    assert.deepStrictEqual(last(as), O.some(3))
    assert.deepStrictEqual(last([]), O.none)
  })

  it("tail", () => {
    assert.deepStrictEqual(tail(as), O.some([2, 3]))
    assert.deepStrictEqual(tail([]), O.none)
  })

  it("takeLeft", () => {
    assert.deepStrictEqual(takeLeft(2)([]), [])
    assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
    assert.deepStrictEqual(takeLeft(0)([1, 2, 3]), [])
  })

  it("takeRight", () => {
    assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
    assert.deepStrictEqual(takeRight(0)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(takeRight(2)([]), [])
    assert.deepStrictEqual(takeRight(5)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(takeRight(10)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("spanLeft", () => {
    assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), {
      init: [1, 3],
      rest: [2, 4, 5]
    })

    // refinements
    const xs: Array<string | number> = [1, "a", 3]
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = spanLeft(isNumber)(xs)
    assert.deepStrictEqual(actual, { init: [1], rest: ["a", 3] })
  })

  it("takeLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(takeLeftWhile(f)([2, 4, 3, 6]), [2, 4])
    assert.deepStrictEqual(takeLeftWhile(f)([]), [])
    assert.deepStrictEqual(takeLeftWhile(f)([1, 2, 4]), [])
    assert.deepStrictEqual(takeLeftWhile(f)([2, 4]), [2, 4])
  })

  it("dropLeft", () => {
    assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
    assert.deepStrictEqual(dropLeft(10)([1, 2, 3]), [])
    assert.deepStrictEqual(dropLeft(0)([1, 2, 3]), [1, 2, 3])
  })

  it("dropRight", () => {
    assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
    assert.deepStrictEqual(dropRight(10)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(dropRight(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("dropLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(dropLeftWhile(f)([1, 3, 2, 4, 5]), [1, 3, 2, 4, 5])
    assert.deepStrictEqual(dropLeftWhile(g)([1, 3, 2, 4, 5]), [2, 4, 5])
    assert.deepStrictEqual(dropLeftWhile(f)([]), [])
    assert.deepStrictEqual(dropLeftWhile(f)([2, 4, 1]), [1])
    assert.deepStrictEqual(dropLeftWhile(f)([2, 4]), [])
  })

  it("init", () => {
    assert.deepStrictEqual(init(as), O.some([1, 2]))
    assert.deepStrictEqual(init([]), O.none)
  })

  it("findIndex", () => {
    assert.deepStrictEqual(findIndex((x) => x === 2)([1, 2, 3]), O.some(1))
    assert.deepStrictEqual(findIndex((x) => x === 2)([]), O.none)
  })

  it("findFirst", () => {
    assert.deepStrictEqual(findFirst((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      findFirst((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 1 },
        { a: 1, b: 2 }
      ]),
      O.some({ a: 1, b: 1 })
    )
    interface A {
      readonly type: "A"
      readonly a: number
    }

    interface B {
      readonly type: "B"
    }

    type AOrB = A | B
    const isA = (x: AOrB): x is A => x.type === "A"
    const xs1: Array<AOrB> = [{ type: "B" }, { type: "A", a: 1 }, { type: "A", a: 2 }]
    assert.deepStrictEqual(findFirst(isA)(xs1), O.some({ type: "A", a: 1 }))
    const xs2: Array<AOrB> = [{ type: "B" }]
    assert.deepStrictEqual(findFirst(isA)(xs2), O.none)
    assert.deepStrictEqual(
      findFirst((x: string | null) => x === null)([null, "a"]),
      O.some(null)
    )
  })

  const optionStringEq = O.getEq(eqString)
  const multipleOf3: Predicate<number> = (x: number) => x % 3 === 0
  const multipleOf3AsString = (x: number) =>
    O.option.map((x) => `${x}`)(O.fromPredicate(multipleOf3)(x))

  it("`findFirstMap(arr, fun)` is equivalent to map and `head(mapOption(arr, fun)`", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) =>
        optionStringEq.equals(
          findFirstMap(multipleOf3AsString)(arr),
          head(array.filterMap(multipleOf3AsString)(arr))
        )
      )
    )
  })

  it("findLast", () => {
    assert.deepStrictEqual(findLast((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 1 },
        { a: 1, b: 2 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 2 },
        { a: 2, b: 1 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      findLast((x: string | null) => x === null)(["a", null]),
      O.some(null)
    )
  })

  it("`findLastMap(arr, fun)` is equivalent to `last(mapOption(arr, fun))`", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) =>
        optionStringEq.equals(
          findLastMap(multipleOf3AsString)(arr),
          last(array.filterMap(multipleOf3AsString)(arr))
        )
      )
    )
  })

  it("findLastIndex", () => {
    interface X {
      readonly a: number
      readonly b: number
    }
    const xs: Array<X> = [
      { a: 1, b: 0 },
      { a: 1, b: 1 }
    ]
    assert.deepStrictEqual(findLastIndex((x: X) => x.a === 1)(xs), O.some(1))
    assert.deepStrictEqual(findLastIndex((x: X) => x.a === 4)(xs), O.none)
    assert.deepStrictEqual(findLastIndex((x: X) => x.a === 1)([]), O.none)
  })

  it("insertAt", () => {
    assert.deepStrictEqual(insertAt(1, 1)([]), O.none)
    assert.deepStrictEqual(insertAt(0, 1)([]), O.some([1]))
    assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), O.some([1, 2, 5, 3, 4]))
  })

  it("unsafeUpdateAt", () => {
    // should return the same reference if nothing changed
    const x = { a: 1 }
    const as = [x]
    const result = unsafeUpdateAt(0, x, as)
    assert.deepStrictEqual(result, as)
  })

  it("updateAt", () => {
    assert.deepStrictEqual(updateAt(1, 1)(as), O.some([1, 1, 3]))
    assert.deepStrictEqual(updateAt(1, 1)([]), O.none)
  })

  it("deleteAt", () => {
    assert.deepStrictEqual(deleteAt(0)(as), O.some([2, 3]))
    assert.deepStrictEqual(deleteAt(1)([]), O.none)
  })

  it("modifyAt", () => {
    const double = (x: number): number => x * 2
    assert.deepStrictEqual(modifyAt(1, double)(as), O.some([1, 4, 3]))
    assert.deepStrictEqual(modifyAt(1, double)([]), O.none)
  })

  it("sort", () => {
    assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
  })

  it("extend", () => {
    const sum = (as: Array<number>) => foldMonoid(monoidSum)(as)
    assert.deepStrictEqual(array.extend(sum)([1, 2, 3, 4]), [10, 9, 7, 4])
    assert.deepStrictEqual(array.extend(identity)([1, 2, 3, 4]), [
      [1, 2, 3, 4],
      [2, 3, 4],
      [3, 4],
      [4]
    ])
  })

  it("zipWith", () => {
    assert.deepStrictEqual(
      zipWith([], [], (n, s) => s + n),
      []
    )
    assert.deepStrictEqual(
      zipWith([1, 2, 3], ["a", "b", "c", "d"], (n, s) => s + n),
      ["a1", "b2", "c3"]
    )
  })

  it("zip", () => {
    assert.deepStrictEqual(zip([], []), [])
    assert.deepStrictEqual(zip([1, 2, 3], ["a", "b", "c", "d"]), [
      [1, "a"],
      [2, "b"],
      [3, "c"]
    ])
  })

  it("unzip", () => {
    assert.deepStrictEqual(unzip([]), [[], []])
    assert.deepStrictEqual(
      unzip([
        [1, "a"],
        [2, "b"],
        [3, "c"]
      ]),
      [
        [1, 2, 3],
        ["a", "b", "c"]
      ]
    )
  })

  it("rights", () => {
    assert.deepStrictEqual(rights([right(1), left("foo"), right(2)]), [1, 2])
    assert.deepStrictEqual(rights([]), [])
  })

  it("lefts", () => {
    assert.deepStrictEqual(lefts([right(1), left("foo"), right(2)]), ["foo"])
    assert.deepStrictEqual(lefts([]), [])
  })

  it("flatten", () => {
    assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
  })

  it("rotate", () => {
    assert.deepStrictEqual(rotate(1)([]), [])
    assert.deepStrictEqual(rotate(1)([1]), [1])
    assert.deepStrictEqual(rotate(1)([1, 2]), [2, 1])
    assert.deepStrictEqual(rotate(2)([1, 2]), [1, 2])
    assert.deepStrictEqual(rotate(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(rotate(1)([1, 2, 3, 4, 5]), [5, 1, 2, 3, 4])
    assert.deepStrictEqual(rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
    assert.deepStrictEqual(rotate(-1)([1, 2, 3, 4, 5]), [2, 3, 4, 5, 1])
    assert.deepStrictEqual(rotate(-2)([1, 2, 3, 4, 5]), [3, 4, 5, 1, 2])
  })

  it("map", () => {
    assert.deepStrictEqual(array.map<number, number>((n) => n * 2)([1, 2, 3]), [
      2,
      4,
      6
    ])
  })

  it("mapWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        [1, 2, 3],
        array.mapWithIndex((i, n) => n + i)
      ),
      [1, 3, 5]
    )
  })

  it("ap", () => {
    assert.deepStrictEqual(
      pipe([(n: number) => n * 2, (n: number) => n + 1], array.ap([1, 2, 3])),
      [2, 4, 6, 2, 3, 4]
    )
  })

  it("copy", () => {
    const xs = [1, 2, 3]
    const ys = copy([1, 2, 3])
    assert.deepStrictEqual(xs, ys)
    assert.deepStrictEqual(xs !== ys, true)
  })

  it("chain", () => {
    assert.deepStrictEqual(
      pipe(
        [1, 2, 3],
        array.chain((n) => [n, n + 1])
      ),
      [1, 2, 2, 3, 3, 4]
    )
  })

  it("reverse", () => {
    assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b", "c"],
        array.reduce("", (acc, a) => acc + a)
      ),
      "abc"
    )
  })

  it("foldMap", () => {
    const foldMap = array.foldMap(monoidString)
    const x1 = ["a", "b", "c"]
    const f1 = identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "abc")
    const x2: Array<string> = []
    assert.deepStrictEqual(pipe(x2, foldMap(f1)), "")
  })

  it("reduceRight", () => {
    const reduceRight = array.reduceRight
    const x1 = ["a", "b", "c"]
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "cba")
    const x2: Array<string> = []
    assert.deepStrictEqual(pipe(x2, reduceRight(init1, f1)), "")
  })

  it("foldLeft", () => {
    const len: <A>(as: Array<A>) => number = foldLeft(
      () => 0,
      (_, tail) => 1 + len(tail)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("foldRight", () => {
    const len: <A>(as: Array<A>) => number = foldRight(
      () => 0,
      (init, _) => 1 + len(init)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("scanLeft", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(scanLeft(10, f)([1, 2, 3]), [10, 9, 7, 4])
    assert.deepStrictEqual(scanLeft(10, f)([0]), [10, 10])
    assert.deepStrictEqual(scanLeft(10, f)([]), [10])
  })

  it("scanRight", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(scanRight(10, f)([1, 2, 3]), [-8, 9, -7, 10])
    assert.deepStrictEqual(scanRight(10, f)([0]), [-10, 10])
    assert.deepStrictEqual(scanRight(10, f)([]), [10])
  })

  it("uniq", () => {
    interface A {
      readonly a: string
      readonly b: number
    }

    const eqA = eq.contramap((f: A) => f.b)(ordNumber)
    const arrA: A = { a: "a", b: 1 }
    const arrB: A = { a: "b", b: 1 }
    const arrC: A = { a: "c", b: 2 }
    const arrD: A = { a: "d", b: 2 }
    const arrUniq = [arrA, arrC]

    assert.deepStrictEqual(uniq(eqA)(arrUniq), arrUniq, "Preserve original array")
    assert.deepStrictEqual(uniq(eqA)([arrA, arrB, arrC, arrD]), [arrA, arrC])
    assert.deepStrictEqual(uniq(eqA)([arrB, arrA, arrC, arrD]), [arrB, arrC])
    assert.deepStrictEqual(uniq(eqA)([arrA, arrA, arrC, arrD, arrA]), [arrA, arrC])
    assert.deepStrictEqual(uniq(eqA)([arrA, arrC]), [arrA, arrC])
    assert.deepStrictEqual(uniq(eqA)([arrC, arrA]), [arrC, arrA])
    assert.deepStrictEqual(uniq(eqBoolean)([true, false, true, false]), [true, false])
    assert.deepStrictEqual(uniq(eqNumber)([]), [])
    assert.deepStrictEqual(uniq(eqNumber)([-0, -0]), [-0])
    assert.deepStrictEqual(uniq(eqNumber)([0, -0]), [0])
    assert.deepStrictEqual(uniq(eqNumber)([1]), [1])
    assert.deepStrictEqual(uniq(eqNumber)([2, 1, 2]), [2, 1])
    assert.deepStrictEqual(uniq(eqNumber)([1, 2, 1]), [1, 2])
    assert.deepStrictEqual(uniq(eqNumber)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(uniq(eqNumber)([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(uniq(eqNumber)([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(uniq(eqString)(["a", "b", "a"]), ["a", "b"])
    assert.deepStrictEqual(uniq(eqString)(["a", "b", "A"]), ["a", "b", "A"])
  })

  it("sortBy", () => {
    interface Person {
      readonly name: string
      readonly age: number
    }
    const byName = ord.contramap((p: Person) => p.name)(ordString)
    const byAge = ord.contramap((p: Person) => p.age)(ordNumber)
    const sortByNameByAge = sortBy([byName, byAge])
    const persons = [
      { name: "a", age: 1 },
      { name: "b", age: 3 },
      { name: "c", age: 2 },
      { name: "b", age: 2 }
    ]
    assert.deepStrictEqual(sortByNameByAge(persons), [
      { name: "a", age: 1 },
      { name: "b", age: 2 },
      { name: "b", age: 3 },
      { name: "c", age: 2 }
    ])
    const sortByAgeByName = sortBy([byAge, byName])
    assert.deepStrictEqual(sortByAgeByName(persons), [
      { name: "a", age: 1 },
      { name: "b", age: 2 },
      { name: "c", age: 2 },
      { name: "b", age: 3 }
    ])

    assert.deepStrictEqual(sortBy([])(persons), persons)
  })

  it("compact", () => {
    assert.deepStrictEqual(array.compact([]), [])
    assert.deepStrictEqual(array.compact([O.some(1), O.some(2), O.some(3)]), [1, 2, 3])
    assert.deepStrictEqual(array.compact([O.some(1), O.none, O.some(3)]), [1, 3])
  })

  it("separate", () => {
    assert.deepStrictEqual(array.separate([]), { left: [], right: [] })
    assert.deepStrictEqual(array.separate([left(123), right("123")]), {
      left: [123],
      right: ["123"]
    })
  })

  it("filter", () => {
    const filter = array.filter
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(filter(g)([1, 2, 3]), [1, 3])
    assert.deepStrictEqual(array.filter(g)([1, 2, 3]), [1, 3])
    const x = filter(O.isSome)([O.some(3), O.some(2), O.some(1)])
    assert.deepStrictEqual(x, [O.some(3), O.some(2), O.some(1)])
    const y = filter(O.isSome)([O.some(3), O.none, O.some(1)])
    assert.deepStrictEqual(y, [O.some(3), O.some(1)])
  })

  it("filterWithIndex", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(array.filterWithIndex(f)(["a", "b", "c"]), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? O.none : O.some(n))
    assert.deepStrictEqual(array.filterMap(f)(as), [1, 3])
    assert.deepStrictEqual(array.filterMap(f)([]), [])
  })

  it("partitionMap", () => {
    assert.deepStrictEqual(pipe([], array.partitionMap(identity)), {
      left: [],
      right: []
    })
    assert.deepStrictEqual(
      pipe([right(1), left("foo"), right(2)], array.partitionMap(identity)),
      {
        left: ["foo"],
        right: [1, 2]
      }
    )
  })

  it("partition", () => {
    const partition = array.partition
    assert.deepStrictEqual(partition(p)([]), { left: [], right: [] })
    assert.deepStrictEqual(partition(p)([1, 3]), { left: [1], right: [3] })
    // refinements
    const xs: Array<string | number> = ["a", "b", 1]
    const isNumber = (x: string | number): x is number => typeof x === "number"
    const actual = partition(isNumber)(xs)
    assert.deepStrictEqual(actual, { left: ["a", "b"], right: [1] })
  })

  it("wither", () => {
    const witherIdentity = array.wither(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? O.some(n + 1) : O.none)
    assert.deepStrictEqual(witherIdentity(f)([]), I.identity.of([]))
    assert.deepStrictEqual(witherIdentity(f)([1, 3]), I.identity.of([4]))
  })

  it("wilt", () => {
    const wiltIdentity = array.wilt(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(wiltIdentity(f)([]), I.identity.of({ left: [], right: [] }))
    assert.deepStrictEqual(
      wiltIdentity(f)([1, 3]),
      I.identity.of({ left: [0], right: [4] })
    )
  })

  it("chop", () => {
    const group = <A>(S: Eq<A>): ((as: Array<A>) => Array<Array<A>>) => {
      return chop((as) => {
        const { init, rest } = spanLeft((a: A) => S.equals(a, as[0]))(as)
        return [init, rest]
      })
    }
    assert.deepStrictEqual(group(eqNumber)([1, 1, 2, 3, 3, 4]), [
      [1, 1],
      [2],
      [3, 3],
      [4]
    ])
  })

  it("splitAt", () => {
    assert.deepStrictEqual(splitAt(2)([1, 2, 3, 4, 5]), [
      [1, 2],
      [3, 4, 5]
    ])
    assert.deepStrictEqual(splitAt(2)([]), [[], []])
    assert.deepStrictEqual(splitAt(2)([1]), [[1], []])
    assert.deepStrictEqual(splitAt(2)([1, 2]), [[1, 2], []])
    assert.deepStrictEqual(splitAt(-1)([1, 2]), [[1], [2]])
    assert.deepStrictEqual(splitAt(0)([1, 2]), [[], [1, 2]])
    assert.deepStrictEqual(splitAt(3)([1, 2]), [[1, 2], []])
  })

  describe("chunksOf", () => {
    it("should split an array into length-n pieces", () => {
      assert.deepStrictEqual(chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
      assert.deepStrictEqual(chunksOf(2)([1, 2, 3, 4, 5, 6]), [
        [1, 2],
        [3, 4],
        [5, 6]
      ])
      assert.deepStrictEqual(chunksOf(5)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(chunksOf(6)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(chunksOf(1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
      assert.deepStrictEqual(chunksOf(0)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(chunksOf(10)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(chunksOf(-1)([1, 2]), [[1, 2]])
    })

    // #897
    it("returns an empty array if provided an empty array", () => {
      assert.deepStrictEqual(chunksOf(1)([]), [])
      assert.deepStrictEqual(chunksOf(2)([]), [])
      assert.deepStrictEqual(chunksOf(0)([]), [])
    })

    // #897
    it("should respect the law: chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))", () => {
      const xs: Array<number> = []
      const ys = [1, 2]
      assert.deepStrictEqual(
        chunksOf(2)(xs).concat(chunksOf(2)(ys)),
        chunksOf(2)(xs.concat(ys))
      )
      fc.assert(
        fc.property(
          fc.array(fc.integer()).filter((xs) => xs.length % 2 === 0), // Ensures `xs.length` is even
          fc.array(fc.integer()),
          fc.integer(1, 1).map((x) => x * 2), // Generates `n` to be even so that it evenly divides `xs`
          (xs, ys, n) => {
            const as = chunksOf(n)(xs).concat(chunksOf(n)(ys))
            const bs = chunksOf(n)(xs.concat(ys))
            isDeepStrictEqual(as, bs)
          }
        )
      )
    })
  })

  it("makeBy", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(makeBy(5, double), [0, 2, 4, 6, 8])
  })

  it("range", () => {
    assert.deepStrictEqual(range(0, 0), [0])
    assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(range(10, 15), [10, 11, 12, 13, 14, 15])
  })

  it("replicate", () => {
    assert.deepStrictEqual(replicate(0, "a"), [])
    assert.deepStrictEqual(replicate(3, "a"), ["a", "a", "a"])
  })

  it("comprehension", () => {
    assert.deepStrictEqual(
      comprehension([[1, 2, 3]], (a) => a * 2),
      [2, 4, 6]
    )
    assert.deepStrictEqual(
      comprehension(
        [
          [1, 2, 3],
          ["a", "b"]
        ],
        tuple
      ),
      [
        [1, "a"],
        [1, "b"],
        [2, "a"],
        [2, "b"],
        [3, "a"],
        [3, "b"]
      ]
    )
    assert.deepStrictEqual(
      comprehension(
        [
          [1, 2, 3],
          ["a", "b"]
        ],
        tuple,
        (a, b) => (a + b.length) % 2 === 0
      ),
      [
        [1, "a"],
        [1, "b"],
        [3, "a"],
        [3, "b"]
      ]
    )
  })

  it("reduceWithIndex", () => {
    assert.deepStrictEqual(
      array.reduceWithIndex("", (i, b, a) => b + i + a)(["a", "b"]),
      "0a1b"
    )
  })

  it("foldMapWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        array.foldMapWithIndex(monoidString)((i, a) => i + a)
      ),
      "0a1b"
    )
  })

  it("reduceRightWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        array.reduceRightWithIndex("", (i, a, b) => b + i + a)
      ),
      "1b0a"
    )
  })

  it("traverseWithIndex", () => {
    const ta = ["a", "bb"]
    assert.deepStrictEqual(
      pipe(
        ta,
        array.traverseWithIndex(O.option)((i, s) =>
          s.length >= 1 ? O.some(s + i) : O.none
        )
      ),
      O.some(["a0", "bb1"])
    )
    assert.deepStrictEqual(
      pipe(
        ta,
        array.traverseWithIndex(O.option)((i, s) =>
          s.length > 1 ? O.some(s + i) : O.none
        )
      ),
      O.none
    )

    // FoldableWithIndex compatibility
    const M = monoidString
    const f = (i: number, s: string): string => s + i
    assert.deepStrictEqual(
      pipe(ta, array.foldMapWithIndex(M)(f)),
      pipe(
        ta,
        array.traverseWithIndex(C.getApplicative(M))((i, a) => C.make(f(i, a)))
      )
    )

    // FunctorWithIndex compatibility
    assert.deepStrictEqual(
      pipe(ta, array.mapWithIndex(f)),
      pipe(
        ta,
        array.traverseWithIndex(I.identity)((i, a) => I.identity.of(f(i, a)))
      )
    )
  })

  it("union", () => {
    assert.deepStrictEqual(union(eqNumber)([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
    assert.deepStrictEqual(union(eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("intersection", () => {
    assert.deepStrictEqual(intersection(eqNumber)([1, 2], [3, 4]), [])
    assert.deepStrictEqual(intersection(eqNumber)([1, 2], [2, 3]), [2])
    assert.deepStrictEqual(intersection(eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("difference", () => {
    assert.deepStrictEqual(difference(eqNumber)([1, 2], [3, 4]), [1, 2])
    assert.deepStrictEqual(difference(eqNumber)([1, 2], [2, 3]), [1])
    assert.deepStrictEqual(difference(eqNumber)([1, 2], [1, 2]), [])
  })

  it("should be safe when calling map with a binary function", () => {
    interface Foo {
      readonly bar: () => number
    }
    const f = (a: number, x?: Foo) => (x !== undefined ? `${a}${x.bar()}` : `${a}`)
    const res = array.map(f)([1, 2])
    assert.deepStrictEqual(res, ["1", "2"])
  })

  it("getShow", () => {
    const S = getShow(showString)
    assert.deepStrictEqual(S.show([]), `[]`)
    assert.deepStrictEqual(S.show(["a"]), `["a"]`)
    assert.deepStrictEqual(S.show(["a", "b"]), `["a", "b"]`)
  })
})
