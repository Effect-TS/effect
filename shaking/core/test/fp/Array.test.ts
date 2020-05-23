import * as assert from "assert"
import { isDeepStrictEqual } from "util"

import * as fc from "fast-check"

import * as A from "../../src/Array"
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
    assert.deepStrictEqual(A.array.alt(() => [3, 4])([1, 2]), [1, 2, 3, 4])
  })

  it("getMonoid", () => {
    const M = A.getMonoid<number>()
    assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(M.concat([1, 2], M.empty), [1, 2])
    assert.deepStrictEqual(M.concat(M.empty, [1, 2]), [1, 2])
  })

  it("getEq", () => {
    const O = A.getEq(ordString)
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
    const O = A.getOrd(ordString)
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
    const as = A.array.ap([1, 2, 3])([(x) => x * 2, (x) => x * 3])
    assert.deepStrictEqual(as, [2, 4, 6, 3, 6, 9])
  })

  it("traverse", () => {
    const tfanone = [1, 2]
    const f = (n: number): O.Option<number> => (n % 2 === 0 ? O.none : O.some(n))
    const fasnone = A.array.traverse(O.option)(f)(tfanone)
    assert.deepStrictEqual(O.isNone(fasnone), true)
    const tfa = [1, 3]
    const fas = A.array.traverse(O.option)(f)(tfa)
    assert.deepStrictEqual(fas, O.some([1, 3]))
  })

  it("sequence", () => {
    assert.deepStrictEqual(
      A.array.sequence(O.option)([O.some(1), O.some(3)]),
      O.some([1, 3])
    )
    assert.deepStrictEqual(A.array.sequence(O.option)([O.some(1), O.none]), O.none)
  })

  it("unfold", () => {
    const as = A.array.unfold(5, (n) => (n > 0 ? O.some([n, n - 1]) : O.none))
    assert.deepStrictEqual(as, [5, 4, 3, 2, 1])
  })

  it("isEmpty", () => {
    assert.deepStrictEqual(A.isEmpty(as), false)
    assert.deepStrictEqual(A.isEmpty([]), true)
  })

  it("isNotEmpty", () => {
    assert.deepStrictEqual(A.isNonEmpty(as), true)
    assert.deepStrictEqual(A.isNonEmpty([]), false)
  })

  it("cons", () => {
    assert.deepStrictEqual(A.cons(0, as), [0, 1, 2, 3])
    assert.deepStrictEqual(A.cons([1], [[2]]), [[1], [2]])
  })

  it("snoc", () => {
    assert.deepStrictEqual(A.snoc(as, 4), [1, 2, 3, 4])
    assert.deepStrictEqual(A.snoc([[1]], [2]), [[1], [2]])
  })

  it("head", () => {
    assert.deepStrictEqual(A.head(as), O.some(1))
    assert.deepStrictEqual(A.head([]), O.none)
  })

  it("last", () => {
    assert.deepStrictEqual(A.last(as), O.some(3))
    assert.deepStrictEqual(A.last([]), O.none)
  })

  it("tail", () => {
    assert.deepStrictEqual(A.tail(as), O.some([2, 3]))
    assert.deepStrictEqual(A.tail([]), O.none)
  })

  it("takeLeft", () => {
    assert.deepStrictEqual(A.takeLeft(2)([]), [])
    assert.deepStrictEqual(A.takeLeft(2)([1, 2, 3]), [1, 2])
    assert.deepStrictEqual(A.takeLeft(0)([1, 2, 3]), [])
  })

  it("takeRight", () => {
    assert.deepStrictEqual(A.takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
    assert.deepStrictEqual(A.takeRight(0)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(A.takeRight(2)([]), [])
    assert.deepStrictEqual(A.takeRight(5)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(A.takeRight(10)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("spanLeft", () => {
    assert.deepStrictEqual(A.spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), {
      init: [1, 3],
      rest: [2, 4, 5]
    })

    // refinements
    const xs: Array<string | number> = [1, "a", 3]
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = A.spanLeft(isNumber)(xs)
    assert.deepStrictEqual(actual, { init: [1], rest: ["a", 3] })
  })

  it("takeLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(A.takeLeftWhile(f)([2, 4, 3, 6]), [2, 4])
    assert.deepStrictEqual(A.takeLeftWhile(f)([]), [])
    assert.deepStrictEqual(A.takeLeftWhile(f)([1, 2, 4]), [])
    assert.deepStrictEqual(A.takeLeftWhile(f)([2, 4]), [2, 4])
  })

  it("dropLeft", () => {
    assert.deepStrictEqual(A.dropLeft(2)([1, 2, 3]), [3])
    assert.deepStrictEqual(A.dropLeft(10)([1, 2, 3]), [])
    assert.deepStrictEqual(A.dropLeft(0)([1, 2, 3]), [1, 2, 3])
  })

  it("dropRight", () => {
    assert.deepStrictEqual(A.dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
    assert.deepStrictEqual(A.dropRight(10)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(A.dropRight(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("dropLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(A.dropLeftWhile(f)([1, 3, 2, 4, 5]), [1, 3, 2, 4, 5])
    assert.deepStrictEqual(A.dropLeftWhile(g)([1, 3, 2, 4, 5]), [2, 4, 5])
    assert.deepStrictEqual(A.dropLeftWhile(f)([]), [])
    assert.deepStrictEqual(A.dropLeftWhile(f)([2, 4, 1]), [1])
    assert.deepStrictEqual(A.dropLeftWhile(f)([2, 4]), [])
  })

  it("init", () => {
    assert.deepStrictEqual(A.init(as), O.some([1, 2]))
    assert.deepStrictEqual(A.init([]), O.none)
  })

  it("findIndex", () => {
    assert.deepStrictEqual(A.findIndex((x) => x === 2)([1, 2, 3]), O.some(1))
    assert.deepStrictEqual(A.findIndex((x) => x === 2)([]), O.none)
  })

  it("findFirst", () => {
    assert.deepStrictEqual(A.findFirst((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      A.findFirst((x: { readonly a: number; readonly b: number }) => x.a === 1)([
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
    assert.deepStrictEqual(A.findFirst(isA)(xs1), O.some({ type: "A", a: 1 }))
    const xs2: Array<AOrB> = [{ type: "B" }]
    assert.deepStrictEqual(A.findFirst(isA)(xs2), O.none)
    assert.deepStrictEqual(
      A.findFirst((x: string | null) => x === null)([null, "a"]),
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
          A.findFirstMap(multipleOf3AsString)(arr),
          A.head(A.array.filterMap(multipleOf3AsString)(arr))
        )
      )
    )
  })

  it("findLast", () => {
    assert.deepStrictEqual(A.findLast((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      A.findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 1 },
        { a: 1, b: 2 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      A.findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 2 },
        { a: 2, b: 1 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      A.findLast((x: string | null) => x === null)(["a", null]),
      O.some(null)
    )
  })

  it("`findLastMap(arr, fun)` is equivalent to `last(mapOption(arr, fun))`", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) =>
        optionStringEq.equals(
          A.findLastMap(multipleOf3AsString)(arr),
          A.last(A.array.filterMap(multipleOf3AsString)(arr))
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
    assert.deepStrictEqual(A.findLastIndex((x: X) => x.a === 1)(xs), O.some(1))
    assert.deepStrictEqual(A.findLastIndex((x: X) => x.a === 4)(xs), O.none)
    assert.deepStrictEqual(A.findLastIndex((x: X) => x.a === 1)([]), O.none)
  })

  it("insertAt", () => {
    assert.deepStrictEqual(A.insertAt(1, 1)([]), O.none)
    assert.deepStrictEqual(A.insertAt(0, 1)([]), O.some([1]))
    assert.deepStrictEqual(A.insertAt(2, 5)([1, 2, 3, 4]), O.some([1, 2, 5, 3, 4]))
  })

  it("unsafeUpdateAt", () => {
    // should return the same reference if nothing changed
    const x = { a: 1 }
    const as = [x]
    const result = A.unsafeUpdateAt(0, x, as)
    assert.deepStrictEqual(result, as)
  })

  it("updateAt", () => {
    assert.deepStrictEqual(A.updateAt(1, 1)(as), O.some([1, 1, 3]))
    assert.deepStrictEqual(A.updateAt(1, 1)([]), O.none)
  })

  it("deleteAt", () => {
    assert.deepStrictEqual(A.deleteAt(0)(as), O.some([2, 3]))
    assert.deepStrictEqual(A.deleteAt(1)([]), O.none)
  })

  it("modifyAt", () => {
    const double = (x: number): number => x * 2
    assert.deepStrictEqual(A.modifyAt(1, double)(as), O.some([1, 4, 3]))
    assert.deepStrictEqual(A.modifyAt(1, double)([]), O.none)
  })

  it("sort", () => {
    assert.deepStrictEqual(A.sort(ordNumber)([3, 2, 1]), [1, 2, 3])
  })

  it("extend", () => {
    const sum = (as: Array<number>) => foldMonoid(monoidSum)(as)
    assert.deepStrictEqual(A.array.extend(sum)([1, 2, 3, 4]), [10, 9, 7, 4])
    assert.deepStrictEqual(A.array.extend(identity)([1, 2, 3, 4]), [
      [1, 2, 3, 4],
      [2, 3, 4],
      [3, 4],
      [4]
    ])
  })

  it("zipWith", () => {
    assert.deepStrictEqual(
      A.zipWith_([], [], (n, s) => s + n),
      []
    )
    assert.deepStrictEqual(
      A.zipWith_([1, 2, 3], ["a", "b", "c", "d"], (n, s) => s + n),
      ["a1", "b2", "c3"]
    )
  })

  it("zip", () => {
    assert.deepStrictEqual(A.zip_([], []), [])
    assert.deepStrictEqual(A.zip_([1, 2, 3], ["a", "b", "c", "d"]), [
      [1, "a"],
      [2, "b"],
      [3, "c"]
    ])
  })

  it("unzip", () => {
    assert.deepStrictEqual(A.unzip([]), [[], []])
    assert.deepStrictEqual(
      A.unzip([
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
    assert.deepStrictEqual(A.rights([right(1), left("foo"), right(2)]), [1, 2])
    assert.deepStrictEqual(A.rights([]), [])
  })

  it("lefts", () => {
    assert.deepStrictEqual(A.lefts([right(1), left("foo"), right(2)]), ["foo"])
    assert.deepStrictEqual(A.lefts([]), [])
  })

  it("flatten", () => {
    assert.deepStrictEqual(A.flatten([[1], [2], [3]]), [1, 2, 3])
  })

  it("rotate", () => {
    assert.deepStrictEqual(A.rotate(1)([]), [])
    assert.deepStrictEqual(A.rotate(1)([1]), [1])
    assert.deepStrictEqual(A.rotate(1)([1, 2]), [2, 1])
    assert.deepStrictEqual(A.rotate(2)([1, 2]), [1, 2])
    assert.deepStrictEqual(A.rotate(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(A.rotate(1)([1, 2, 3, 4, 5]), [5, 1, 2, 3, 4])
    assert.deepStrictEqual(A.rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
    assert.deepStrictEqual(A.rotate(-1)([1, 2, 3, 4, 5]), [2, 3, 4, 5, 1])
    assert.deepStrictEqual(A.rotate(-2)([1, 2, 3, 4, 5]), [3, 4, 5, 1, 2])
  })

  it("map", () => {
    assert.deepStrictEqual(A.array.map<number, number>((n) => n * 2)([1, 2, 3]), [
      2,
      4,
      6
    ])
  })

  it("mapWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        [1, 2, 3],
        A.array.mapWithIndex((i, n) => n + i)
      ),
      [1, 3, 5]
    )
  })

  it("ap", () => {
    assert.deepStrictEqual(
      pipe([(n: number) => n * 2, (n: number) => n + 1], A.array.ap([1, 2, 3])),
      [2, 4, 6, 2, 3, 4]
    )
  })

  it("copy", () => {
    const xs = [1, 2, 3]
    const ys = A.copy([1, 2, 3])
    assert.deepStrictEqual(xs, ys)
    assert.deepStrictEqual(xs !== ys, true)
  })

  it("chain", () => {
    assert.deepStrictEqual(
      pipe(
        [1, 2, 3],
        A.array.chain((n) => [n, n + 1])
      ),
      [1, 2, 2, 3, 3, 4]
    )
  })

  it("reverse", () => {
    assert.deepStrictEqual(A.reverse([1, 2, 3]), [3, 2, 1])
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b", "c"],
        A.array.reduce("", (acc, a) => acc + a)
      ),
      "abc"
    )
  })

  it("foldMap", () => {
    const foldMap = A.array.foldMap(monoidString)
    const x1 = ["a", "b", "c"]
    const f1 = identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "abc")
    const x2: Array<string> = []
    assert.deepStrictEqual(pipe(x2, foldMap(f1)), "")
  })

  it("reduceRight", () => {
    const reduceRight = A.array.reduceRight
    const x1 = ["a", "b", "c"]
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "cba")
    const x2: Array<string> = []
    assert.deepStrictEqual(pipe(x2, reduceRight(init1, f1)), "")
  })

  it("foldLeft", () => {
    const len: <A>(as: Array<A>) => number = A.foldLeft(
      () => 0,
      (_, tail) => 1 + len(tail)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("foldRight", () => {
    const len: <A>(as: Array<A>) => number = A.foldRight(
      () => 0,
      (init, _) => 1 + len(init)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("scanLeft", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(A.scanLeft(10, f)([1, 2, 3]), [10, 9, 7, 4])
    assert.deepStrictEqual(A.scanLeft(10, f)([0]), [10, 10])
    assert.deepStrictEqual(A.scanLeft(10, f)([]), [10])
  })

  it("scanRight", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(A.scanRight(10, f)([1, 2, 3]), [-8, 9, -7, 10])
    assert.deepStrictEqual(A.scanRight(10, f)([0]), [-10, 10])
    assert.deepStrictEqual(A.scanRight(10, f)([]), [10])
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

    assert.deepStrictEqual(A.uniq(eqA)(arrUniq), arrUniq, "Preserve original array")
    assert.deepStrictEqual(A.uniq(eqA)([arrA, arrB, arrC, arrD]), [arrA, arrC])
    assert.deepStrictEqual(A.uniq(eqA)([arrB, arrA, arrC, arrD]), [arrB, arrC])
    assert.deepStrictEqual(A.uniq(eqA)([arrA, arrA, arrC, arrD, arrA]), [arrA, arrC])
    assert.deepStrictEqual(A.uniq(eqA)([arrA, arrC]), [arrA, arrC])
    assert.deepStrictEqual(A.uniq(eqA)([arrC, arrA]), [arrC, arrA])
    assert.deepStrictEqual(A.uniq(eqBoolean)([true, false, true, false]), [true, false])
    assert.deepStrictEqual(A.uniq(eqNumber)([]), [])
    assert.deepStrictEqual(A.uniq(eqNumber)([-0, -0]), [-0])
    assert.deepStrictEqual(A.uniq(eqNumber)([0, -0]), [0])
    assert.deepStrictEqual(A.uniq(eqNumber)([1]), [1])
    assert.deepStrictEqual(A.uniq(eqNumber)([2, 1, 2]), [2, 1])
    assert.deepStrictEqual(A.uniq(eqNumber)([1, 2, 1]), [1, 2])
    assert.deepStrictEqual(A.uniq(eqNumber)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(A.uniq(eqNumber)([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(A.uniq(eqNumber)([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(A.uniq(eqString)(["a", "b", "a"]), ["a", "b"])
    assert.deepStrictEqual(A.uniq(eqString)(["a", "b", "A"]), ["a", "b", "A"])
  })

  it("sortBy", () => {
    interface Person {
      readonly name: string
      readonly age: number
    }
    const byName = ord.contramap((p: Person) => p.name)(ordString)
    const byAge = ord.contramap((p: Person) => p.age)(ordNumber)
    const sortByNameByAge = A.sortBy([byName, byAge])
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
    const sortByAgeByName = A.sortBy([byAge, byName])
    assert.deepStrictEqual(sortByAgeByName(persons), [
      { name: "a", age: 1 },
      { name: "b", age: 2 },
      { name: "c", age: 2 },
      { name: "b", age: 3 }
    ])

    assert.deepStrictEqual(A.sortBy([])(persons), persons)
  })

  it("compact", () => {
    assert.deepStrictEqual(A.array.compact([]), [])
    assert.deepStrictEqual(A.array.compact([O.some(1), O.some(2), O.some(3)]), [
      1,
      2,
      3
    ])
    assert.deepStrictEqual(A.array.compact([O.some(1), O.none, O.some(3)]), [1, 3])
  })

  it("separate", () => {
    assert.deepStrictEqual(A.array.separate([]), { left: [], right: [] })
    assert.deepStrictEqual(A.array.separate([left(123), right("123")]), {
      left: [123],
      right: ["123"]
    })
  })

  it("filter", () => {
    const filter = A.array.filter
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(filter(g)([1, 2, 3]), [1, 3])
    assert.deepStrictEqual(A.array.filter(g)([1, 2, 3]), [1, 3])
    const x = filter(O.isSome)([O.some(3), O.some(2), O.some(1)])
    assert.deepStrictEqual(x, [O.some(3), O.some(2), O.some(1)])
    const y = filter(O.isSome)([O.some(3), O.none, O.some(1)])
    assert.deepStrictEqual(y, [O.some(3), O.some(1)])
  })

  it("filterWithIndex", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(A.array.filterWithIndex(f)(["a", "b", "c"]), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? O.none : O.some(n))
    assert.deepStrictEqual(A.array.filterMap(f)(as), [1, 3])
    assert.deepStrictEqual(A.array.filterMap(f)([]), [])
  })

  it("partitionMap", () => {
    assert.deepStrictEqual(pipe([], A.array.partitionMap(identity)), {
      left: [],
      right: []
    })
    assert.deepStrictEqual(
      pipe([right(1), left("foo"), right(2)], A.array.partitionMap(identity)),
      {
        left: ["foo"],
        right: [1, 2]
      }
    )
  })

  it("partition", () => {
    const partition = A.array.partition
    assert.deepStrictEqual(partition(p)([]), { left: [], right: [] })
    assert.deepStrictEqual(partition(p)([1, 3]), { left: [1], right: [3] })
    // refinements
    const xs: Array<string | number> = ["a", "b", 1]
    const isNumber = (x: string | number): x is number => typeof x === "number"
    const actual = partition(isNumber)(xs)
    assert.deepStrictEqual(actual, { left: ["a", "b"], right: [1] })
  })

  it("wither", () => {
    const witherIdentity = A.array.wither(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? O.some(n + 1) : O.none)
    assert.deepStrictEqual(witherIdentity(f)([]), I.identity.of([]))
    assert.deepStrictEqual(witherIdentity(f)([1, 3]), I.identity.of([4]))
  })

  it("wilt", () => {
    const wiltIdentity = A.array.wilt(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(wiltIdentity(f)([]), I.identity.of({ left: [], right: [] }))
    assert.deepStrictEqual(
      wiltIdentity(f)([1, 3]),
      I.identity.of({ left: [0], right: [4] })
    )
  })

  it("chop", () => {
    const group = <A>(S: Eq<A>): ((as: Array<A>) => Array<Array<A>>) => {
      return A.chop((as) => {
        const { init, rest } = A.spanLeft((a: A) => S.equals(a, as[0]))(as)
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
    assert.deepStrictEqual(A.splitAt(2)([1, 2, 3, 4, 5]), [
      [1, 2],
      [3, 4, 5]
    ])
    assert.deepStrictEqual(A.splitAt(2)([]), [[], []])
    assert.deepStrictEqual(A.splitAt(2)([1]), [[1], []])
    assert.deepStrictEqual(A.splitAt(2)([1, 2]), [[1, 2], []])
    assert.deepStrictEqual(A.splitAt(-1)([1, 2]), [[1], [2]])
    assert.deepStrictEqual(A.splitAt(0)([1, 2]), [[], [1, 2]])
    assert.deepStrictEqual(A.splitAt(3)([1, 2]), [[1, 2], []])
  })

  describe("chunksOf", () => {
    it("should split an array into length-n pieces", () => {
      assert.deepStrictEqual(A.chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
      assert.deepStrictEqual(A.chunksOf(2)([1, 2, 3, 4, 5, 6]), [
        [1, 2],
        [3, 4],
        [5, 6]
      ])
      assert.deepStrictEqual(A.chunksOf(5)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(A.chunksOf(6)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(A.chunksOf(1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
      assert.deepStrictEqual(A.chunksOf(0)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(A.chunksOf(10)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(A.chunksOf(-1)([1, 2]), [[1, 2]])
    })

    // #897
    it("returns an empty array if provided an empty array", () => {
      assert.deepStrictEqual(A.chunksOf(1)([]), [])
      assert.deepStrictEqual(A.chunksOf(2)([]), [])
      assert.deepStrictEqual(A.chunksOf(0)([]), [])
    })

    // #897
    it("should respect the law: chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))", () => {
      const xs: Array<number> = []
      const ys = [1, 2]
      assert.deepStrictEqual(
        A.chunksOf(2)(xs).concat(A.chunksOf(2)(ys)),
        A.chunksOf(2)(xs.concat(ys))
      )
      fc.assert(
        fc.property(
          fc.array(fc.integer()).filter((xs) => xs.length % 2 === 0), // Ensures `xs.length` is even
          fc.array(fc.integer()),
          fc.integer(1, 1).map((x) => x * 2), // Generates `n` to be even so that it evenly divides `xs`
          (xs, ys, n) => {
            const as = A.chunksOf(n)(xs).concat(A.chunksOf(n)(ys))
            const bs = A.chunksOf(n)(xs.concat(ys))
            isDeepStrictEqual(as, bs)
          }
        )
      )
    })
  })

  it("makeBy", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(A.makeBy(5, double), [0, 2, 4, 6, 8])
  })

  it("range", () => {
    assert.deepStrictEqual(A.range(0, 0), [0])
    assert.deepStrictEqual(A.range(1, 5), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(A.range(10, 15), [10, 11, 12, 13, 14, 15])
  })

  it("replicate", () => {
    assert.deepStrictEqual(A.replicate(0, "a"), [])
    assert.deepStrictEqual(A.replicate(3, "a"), ["a", "a", "a"])
  })

  it("comprehension", () => {
    assert.deepStrictEqual(
      A.comprehension([[1, 2, 3]], (a) => a * 2),
      [2, 4, 6]
    )
    assert.deepStrictEqual(
      A.comprehension(
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
      A.comprehension(
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
      A.array.reduceWithIndex("", (i, b, a) => b + i + a)(["a", "b"]),
      "0a1b"
    )
  })

  it("foldMapWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        A.array.foldMapWithIndex(monoidString)((i, a) => i + a)
      ),
      "0a1b"
    )
  })

  it("reduceRightWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        A.array.reduceRightWithIndex("", (i, a, b) => b + i + a)
      ),
      "1b0a"
    )
  })

  it("traverseWithIndex", () => {
    const ta = ["a", "bb"]
    assert.deepStrictEqual(
      pipe(
        ta,
        A.array.traverseWithIndex(O.option)((i, s) =>
          s.length >= 1 ? O.some(s + i) : O.none
        )
      ),
      O.some(["a0", "bb1"])
    )
    assert.deepStrictEqual(
      pipe(
        ta,
        A.array.traverseWithIndex(O.option)((i, s) =>
          s.length > 1 ? O.some(s + i) : O.none
        )
      ),
      O.none
    )

    // FoldableWithIndex compatibility
    const M = monoidString
    const f = (i: number, s: string): string => s + i
    assert.deepStrictEqual(
      pipe(ta, A.array.foldMapWithIndex(M)(f)),
      pipe(
        ta,
        A.array.traverseWithIndex(C.getApplicative(M))((i, a) => C.make(f(i, a)))
      )
    )

    // FunctorWithIndex compatibility
    assert.deepStrictEqual(
      pipe(ta, A.array.mapWithIndex(f)),
      pipe(
        ta,
        A.array.traverseWithIndex(I.identity)((i, a) => I.identity.of(f(i, a)))
      )
    )
  })

  it("union", () => {
    assert.deepStrictEqual(A.union(eqNumber)([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(A.union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
    assert.deepStrictEqual(A.union(eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("intersection", () => {
    assert.deepStrictEqual(A.intersection(eqNumber)([1, 2], [3, 4]), [])
    assert.deepStrictEqual(A.intersection(eqNumber)([1, 2], [2, 3]), [2])
    assert.deepStrictEqual(A.intersection(eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("difference", () => {
    assert.deepStrictEqual(A.difference(eqNumber)([1, 2], [3, 4]), [1, 2])
    assert.deepStrictEqual(A.difference(eqNumber)([1, 2], [2, 3]), [1])
    assert.deepStrictEqual(A.difference(eqNumber)([1, 2], [1, 2]), [])
  })

  it("should be safe when calling map with a binary function", () => {
    interface Foo {
      readonly bar: () => number
    }
    const f = (a: number, x?: Foo) => (x !== undefined ? `${a}${x.bar()}` : `${a}`)
    const res = A.array.map(f)([1, 2])
    assert.deepStrictEqual(res, ["1", "2"])
  })

  it("getShow", () => {
    const S = A.getShow(showString)
    assert.deepStrictEqual(S.show([]), `[]`)
    assert.deepStrictEqual(S.show(["a"]), `["a"]`)
    assert.deepStrictEqual(S.show(["a", "b"]), `["a", "b"]`)
  })
})
