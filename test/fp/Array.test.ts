import * as assert from "assert"
import { isDeepStrictEqual } from "util"

import * as fc from "fast-check"

import * as _ from "../../src/Array"
import * as C from "../../src/Const"
import * as E from "../../src/Either"
import * as Eq from "../../src/Eq"
import * as F from "../../src/Function"
import { pipe } from "../../src/Function"
import * as I from "../../src/Identity"
import * as M from "../../src/Monoid"
import * as O from "../../src/Option"
import * as Ord from "../../src/Ord"
import { showString } from "../../src/Show"

describe("Array", () => {
  const as: _.Array<number> = [1, 2, 3]

  it("alt", () => {
    assert.deepStrictEqual(_.array.alt(() => [3, 4])([1, 2]), [1, 2, 3, 4])
  })

  it("getMonoid", () => {
    const M = _.getMonoid<number>()
    assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(M.concat([1, 2], M.empty), [1, 2])
    assert.deepStrictEqual(M.concat(M.empty, [1, 2]), [1, 2])
  })

  it("getEq", () => {
    const O = _.getEq(Ord.ordString)
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
    const O = _.getOrd(Ord.ordString)
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
    const as = _.array.ap([1, 2, 3])([(x) => x * 2, (x) => x * 3])
    assert.deepStrictEqual(as, [2, 4, 6, 3, 6, 9])
  })

  it("traverse", () => {
    const tfanone: _.Array<number> = [1, 2]
    const f = (n: number): O.Option<number> => (n % 2 === 0 ? O.none : O.some(n))
    const fasnone = _.array.traverse(O.option)(f)(tfanone)
    assert.deepStrictEqual(O.isNone(fasnone), true)
    const tfa: _.Array<number> = [1, 3]
    const fas = _.array.traverse(O.option)(f)(tfa)
    assert.deepStrictEqual(fas, O.some([1, 3]))
  })

  it("sequence", () => {
    assert.deepStrictEqual(
      _.array.sequence(O.option)([O.some(1), O.some(3)]),
      O.some([1, 3])
    )
    assert.deepStrictEqual(_.array.sequence(O.option)([O.some(1), O.none]), O.none)
  })

  it("unfold", () => {
    const as = _.array.unfold(5, (n) => (n > 0 ? O.some([n, n - 1]) : O.none))
    assert.deepStrictEqual(as, [5, 4, 3, 2, 1])
  })

  it("isEmpty", () => {
    assert.deepStrictEqual(_.isEmpty(as), false)
    assert.deepStrictEqual(_.isEmpty([]), true)
  })

  it("isNotEmpty", () => {
    assert.deepStrictEqual(_.isNonEmpty(as), true)
    assert.deepStrictEqual(_.isNonEmpty([]), false)
  })

  it("cons", () => {
    assert.deepStrictEqual(_.cons(0)(as), [0, 1, 2, 3])
    assert.deepStrictEqual(_.cons([1])([[2]]), [[1], [2]])
  })

  it("snoc", () => {
    assert.deepStrictEqual(_.snoc(4)(as), [1, 2, 3, 4])
    assert.deepStrictEqual(_.snoc([2])([[1]]), [[1], [2]])
  })

  it("head", () => {
    assert.deepStrictEqual(_.head(as), O.some(1))
    assert.deepStrictEqual(_.head([]), O.none)
  })

  it("last", () => {
    assert.deepStrictEqual(_.last(as), O.some(3))
    assert.deepStrictEqual(_.last([]), O.none)
  })

  it("tail", () => {
    assert.deepStrictEqual(_.tail(as), O.some([2, 3]))
    assert.deepStrictEqual(_.tail([]), O.none)
  })

  it("takeLeft", () => {
    assert.deepStrictEqual(_.takeLeft(2)([]), [])
    assert.deepStrictEqual(_.takeLeft(2)([1, 2, 3]), [1, 2])
    assert.deepStrictEqual(_.takeLeft(0)([1, 2, 3]), [])
  })

  it("takeRight", () => {
    assert.deepStrictEqual(_.takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
    assert.deepStrictEqual(_.takeRight(0)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(_.takeRight(2)([]), [])
    assert.deepStrictEqual(_.takeRight(5)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(_.takeRight(10)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("spanLeft", () => {
    assert.deepStrictEqual(_.spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), {
      init: [1, 3],
      rest: [2, 4, 5]
    })

    // refinements
    const xs: _.Array<string | number> = [1, "a", 3]
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = _.spanLeft(isNumber)(xs)
    assert.deepStrictEqual(actual, { init: [1], rest: ["a", 3] })
  })

  it("takeLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(_.takeLeftWhile(f)([2, 4, 3, 6]), [2, 4])
    assert.deepStrictEqual(_.takeLeftWhile(f)([]), [])
    assert.deepStrictEqual(_.takeLeftWhile(f)([1, 2, 4]), [])
    assert.deepStrictEqual(_.takeLeftWhile(f)([2, 4]), [2, 4])
  })

  it("dropLeft", () => {
    assert.deepStrictEqual(_.dropLeft(2)([1, 2, 3]), [3])
    assert.deepStrictEqual(_.dropLeft(10)([1, 2, 3]), [])
    assert.deepStrictEqual(_.dropLeft(0)([1, 2, 3]), [1, 2, 3])
  })

  it("dropRight", () => {
    assert.deepStrictEqual(_.dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
    assert.deepStrictEqual(_.dropRight(10)([1, 2, 3, 4, 5]), [])
    assert.deepStrictEqual(_.dropRight(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
  })

  it("dropLeftWhile", () => {
    const f = (n: number) => n % 2 === 0
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(_.dropLeftWhile(f)([1, 3, 2, 4, 5]), [1, 3, 2, 4, 5])
    assert.deepStrictEqual(_.dropLeftWhile(g)([1, 3, 2, 4, 5]), [2, 4, 5])
    assert.deepStrictEqual(_.dropLeftWhile(f)([]), [])
    assert.deepStrictEqual(_.dropLeftWhile(f)([2, 4, 1]), [1])
    assert.deepStrictEqual(_.dropLeftWhile(f)([2, 4]), [])
  })

  it("init", () => {
    assert.deepStrictEqual(_.init(as), O.some([1, 2]))
    assert.deepStrictEqual(_.init([]), O.none)
  })

  it("findIndex", () => {
    assert.deepStrictEqual(_.findIndex((x) => x === 2)([1, 2, 3]), O.some(1))
    assert.deepStrictEqual(_.findIndex((x) => x === 2)([]), O.none)
  })

  it("findFirst", () => {
    assert.deepStrictEqual(_.findFirst((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      _.findFirst((x: { readonly a: number; readonly b: number }) => x.a === 1)([
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
    const xs1: _.Array<AOrB> = [{ type: "B" }, { type: "A", a: 1 }, { type: "A", a: 2 }]
    assert.deepStrictEqual(_.findFirst(isA)(xs1), O.some({ type: "A", a: 1 }))
    const xs2: _.Array<AOrB> = [{ type: "B" }]
    assert.deepStrictEqual(_.findFirst(isA)(xs2), O.none)
    assert.deepStrictEqual(
      _.findFirst((x: string | null) => x === null)([null, "a"]),
      O.some(null)
    )
  })

  const optionStringEq = O.getEq(Eq.eqString)
  const multipleOf3: F.Predicate<number> = (x: number) => x % 3 === 0
  const multipleOf3AsString = (x: number) =>
    O.option.map((x) => `${x}`)(O.fromPredicate(multipleOf3)(x))

  it("`findFirstMap(arr, fun)` is equivalent to map and `head(mapOption(arr, fun)`", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) =>
        optionStringEq.equals(
          _.findFirstMap(multipleOf3AsString)(arr),
          _.head(_.array.filterMap(multipleOf3AsString)(arr))
        )
      )
    )
  })

  it("findLast", () => {
    assert.deepStrictEqual(_.findLast((x) => x === 2)([]), O.none)
    assert.deepStrictEqual(
      _.findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 1 },
        { a: 1, b: 2 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      _.findLast((x: { readonly a: number; readonly b: number }) => x.a === 1)([
        { a: 1, b: 2 },
        { a: 2, b: 1 }
      ]),
      O.some({ a: 1, b: 2 })
    )
    assert.deepStrictEqual(
      _.findLast((x: string | null) => x === null)(["a", null]),
      O.some(null)
    )
  })

  it("`findLastMap(arr, fun)` is equivalent to `last(mapOption(arr, fun))`", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) =>
        optionStringEq.equals(
          _.findLastMap(multipleOf3AsString)(arr),
          _.last(_.array.filterMap(multipleOf3AsString)(arr))
        )
      )
    )
  })

  it("findLastIndex", () => {
    interface X {
      readonly a: number
      readonly b: number
    }
    const xs: _.Array<X> = [
      { a: 1, b: 0 },
      { a: 1, b: 1 }
    ]
    assert.deepStrictEqual(_.findLastIndex((x: X) => x.a === 1)(xs), O.some(1))
    assert.deepStrictEqual(_.findLastIndex((x: X) => x.a === 4)(xs), O.none)
    assert.deepStrictEqual(_.findLastIndex((x: X) => x.a === 1)([]), O.none)
  })

  it("insertAt", () => {
    assert.deepStrictEqual(_.insertAt(1, 1)([]), O.none)
    assert.deepStrictEqual(_.insertAt(0, 1)([]), O.some([1]))
    assert.deepStrictEqual(_.insertAt(2, 5)([1, 2, 3, 4]), O.some([1, 2, 5, 3, 4]))
  })

  it("unsafeUpdateAt", () => {
    // should return the same reference if nothing changed
    const x = { a: 1 }
    const as: _.Array<{ readonly a: number }> = [x]
    const result = _.unsafeUpdateAt_(as, 0, x)
    assert.deepStrictEqual(result, as)
  })

  it("updateAt", () => {
    assert.deepStrictEqual(_.updateAt(1, 1)(as), O.some([1, 1, 3]))
    assert.deepStrictEqual(_.updateAt(1, 1)([]), O.none)
  })

  it("deleteAt", () => {
    assert.deepStrictEqual(_.deleteAt(0)(as), O.some([2, 3]))
    assert.deepStrictEqual(_.deleteAt(1)([]), O.none)
  })

  it("modifyAt", () => {
    const double = (x: number): number => x * 2
    assert.deepStrictEqual(_.modifyAt(1, double)(as), O.some([1, 4, 3]))
    assert.deepStrictEqual(_.modifyAt(1, double)([]), O.none)
  })

  it("sort", () => {
    assert.deepStrictEqual(_.sort(Ord.ordNumber)([3, 2, 1]), [1, 2, 3])
  })

  it("extend", () => {
    const sum = (as: _.Array<number>) => M.fold(M.monoidSum)(as)
    assert.deepStrictEqual(_.array.extend(sum)([1, 2, 3, 4]), [10, 9, 7, 4])
    assert.deepStrictEqual(_.array.extend(F.identity)([1, 2, 3, 4]), [
      [1, 2, 3, 4],
      [2, 3, 4],
      [3, 4],
      [4]
    ])
  })

  it("zipWith", () => {
    assert.deepStrictEqual(
      _.zipWith_([1, 2, 3], ["a", "b", "c", "d"], (n, s) => s + n),
      ["a1", "b2", "c3"]
    )
  })

  it("zip", () => {
    assert.deepStrictEqual(_.zip_([1, 2, 3], ["a", "b", "c", "d"]), [
      [1, "a"],
      [2, "b"],
      [3, "c"]
    ])
  })

  it("unzip", () => {
    assert.deepStrictEqual(
      _.unzip([
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
    assert.deepStrictEqual(_.rights([E.right(1), E.left("foo"), E.right(2)]), [1, 2])
    assert.deepStrictEqual(_.rights([]), [])
  })

  it("lefts", () => {
    assert.deepStrictEqual(_.lefts([E.right(1), E.left("foo"), E.right(2)]), ["foo"])
    assert.deepStrictEqual(_.lefts([]), [])
  })

  it("flatten", () => {
    assert.deepStrictEqual(_.flatten([[1], [2], [3]]), [1, 2, 3])
  })

  it("rotate", () => {
    assert.deepStrictEqual(_.rotate(1)([]), [])
    assert.deepStrictEqual(_.rotate(1)([1]), [1])
    assert.deepStrictEqual(_.rotate(1)([1, 2]), [2, 1])
    assert.deepStrictEqual(_.rotate(2)([1, 2]), [1, 2])
    assert.deepStrictEqual(_.rotate(0)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(_.rotate(1)([1, 2, 3, 4, 5]), [5, 1, 2, 3, 4])
    assert.deepStrictEqual(_.rotate(2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
    assert.deepStrictEqual(_.rotate(-1)([1, 2, 3, 4, 5]), [2, 3, 4, 5, 1])
    assert.deepStrictEqual(_.rotate(-2)([1, 2, 3, 4, 5]), [3, 4, 5, 1, 2])
  })

  it("map", () => {
    assert.deepStrictEqual(_.array.map((n: number) => n * 2)([1, 2, 3]), [2, 4, 6])
  })

  it("mapWithIndex", () => {
    assert.deepStrictEqual(
      _.array.mapWithIndex((i: number, n: number) => n + i)([1, 2, 3]),
      [1, 3, 5]
    )
  })

  it("ap", () => {
    assert.deepStrictEqual(
      _.array.ap([1, 2, 3])([(n: number) => n * 2, (n: number) => n + 1]),
      [2, 4, 6, 2, 3, 4]
    )
  })

  it("chain", () => {
    assert.deepStrictEqual(
      pipe(
        [1, 2, 3],
        _.array.chain((n) => [n, n + 1])
      ),
      [1, 2, 2, 3, 3, 4]
    )
  })

  it("reverse", () => {
    assert.deepStrictEqual(_.reverse([1, 2, 3]), [3, 2, 1])
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      _.array.reduce("", (acc, a) => acc + a)(["a", "b", "c"]),
      "abc"
    )
  })

  it("foldMap", () => {
    const foldMap = _.array.foldMap(M.monoidString)
    const x1: _.Array<string> = ["a", "b", "c"]
    const f1 = F.identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "abc")
    const x2: _.Array<string> = []
    assert.deepStrictEqual(pipe(x2, foldMap(f1)), "")
  })

  it("reduceRight", () => {
    const { reduceRight } = _.array
    const x1: _.Array<string> = ["a", "b", "c"]
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "cba")
    const x2: _.Array<string> = []
    assert.deepStrictEqual(pipe(x2, reduceRight(init1, f1)), "")
  })

  it("foldLeft", () => {
    const len: <A>(as: _.Array<A>) => number = _.foldLeft(
      () => 0,
      (_, tail) => 1 + len(tail)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("foldRight", () => {
    const len: <A>(as: _.Array<A>) => number = _.foldRight(
      () => 0,
      (init, _) => 1 + len(init)
    )
    assert.deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("scanLeft", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(_.scanLeft(10, f)([1, 2, 3]), [10, 9, 7, 4])
    assert.deepStrictEqual(_.scanLeft(10, f)([0]), [10, 10])
    assert.deepStrictEqual(_.scanLeft(10, f)([]), [10])
  })

  it("scanRight", () => {
    const f = (b: number, a: number) => b - a
    assert.deepStrictEqual(_.scanRight(10, f)([1, 2, 3]), [-8, 9, -7, 10])
    assert.deepStrictEqual(_.scanRight(10, f)([0]), [-10, 10])
    assert.deepStrictEqual(_.scanRight(10, f)([]), [10])
  })

  it("uniq", () => {
    interface A {
      readonly a: string
      readonly b: number
    }

    const eqA = Eq.eq.contramap((f: A) => f.b)(Ord.ordNumber)
    const arrA: A = { a: "a", b: 1 }
    const arrB: A = { a: "b", b: 1 }
    const arrC: A = { a: "c", b: 2 }
    const arrD: A = { a: "d", b: 2 }
    const arrUniq: _.Array<A> = [arrA, arrC]

    assert.deepStrictEqual(_.uniq(eqA)(arrUniq), arrUniq, "Preserve original array")
    assert.deepStrictEqual(_.uniq(eqA)([arrA, arrB, arrC, arrD]), [arrA, arrC])
    assert.deepStrictEqual(_.uniq(eqA)([arrB, arrA, arrC, arrD]), [arrB, arrC])
    assert.deepStrictEqual(_.uniq(eqA)([arrA, arrA, arrC, arrD, arrA]), [arrA, arrC])
    assert.deepStrictEqual(_.uniq(eqA)([arrA, arrC]), [arrA, arrC])
    assert.deepStrictEqual(_.uniq(eqA)([arrC, arrA]), [arrC, arrA])
    assert.deepStrictEqual(_.uniq(Eq.eqBoolean)([true, false, true, false]), [
      true,
      false
    ])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([]), [])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([-0, -0]), [-0])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([0, -0]), [0])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([1]), [1])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([2, 1, 2]), [2, 1])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([1, 2, 1]), [1, 2])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(_.uniq(Eq.eqNumber)([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]), [
      1,
      2,
      3,
      4,
      5
    ])
    assert.deepStrictEqual(_.uniq(Eq.eqString)(["a", "b", "a"]), ["a", "b"])
    assert.deepStrictEqual(_.uniq(Eq.eqString)(["a", "b", "A"]), ["a", "b", "A"])
  })

  it("sortBy", () => {
    interface Person {
      readonly name: string
      readonly age: number
    }
    const byName = Ord.ord.contramap((p: Person) => p.name)(Ord.ordString)
    const byAge = Ord.ord.contramap((p: Person) => p.age)(Ord.ordNumber)
    const sortByNameByAge = _.sortBy([byName, byAge])
    const persons: _.Array<Person> = [
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
    const sortByAgeByName = _.sortBy([byAge, byName])
    assert.deepStrictEqual(sortByAgeByName(persons), [
      { name: "a", age: 1 },
      { name: "b", age: 2 },
      { name: "c", age: 2 },
      { name: "b", age: 3 }
    ])

    assert.deepStrictEqual(_.sortBy([])(persons), persons)
  })

  it("compact", () => {
    assert.deepStrictEqual(_.array.compact([]), [])
    assert.deepStrictEqual(_.array.compact([O.some(1), O.some(2), O.some(3)]), [
      1,
      2,
      3
    ])
    assert.deepStrictEqual(_.array.compact([O.some(1), O.none, O.some(3)]), [1, 3])
  })

  it("separate", () => {
    assert.deepStrictEqual(_.array.separate([]), { left: [], right: [] })
    assert.deepStrictEqual(_.array.separate([E.left(123), E.right("123")]), {
      left: [123],
      right: ["123"]
    })
  })

  it("filter", () => {
    const { filter } = _.array
    const g = (n: number) => n % 2 === 1
    assert.deepStrictEqual(filter(g)([1, 2, 3]), [1, 3])
    assert.deepStrictEqual(_.array.filter(g)([1, 2, 3]), [1, 3])
    const x = filter(O.isSome)([O.some(3), O.some(2), O.some(1)])
    assert.deepStrictEqual(x, [O.some(3), O.some(2), O.some(1)])
    const y = filter(O.isSome)([O.some(3), O.none, O.some(1)])
    assert.deepStrictEqual(y, [O.some(3), O.some(1)])
  })

  it("filterWithIndex", () => {
    const f = (n: number) => n % 2 === 0
    assert.deepStrictEqual(_.array.filterWithIndex(f)(["a", "b", "c"]), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? O.none : O.some(n))
    assert.deepStrictEqual(_.array.filterMap(f)(as), [1, 3])
    assert.deepStrictEqual(_.array.filterMap(f)([]), [])
  })

  it("partitionMap", () => {
    assert.deepStrictEqual(pipe([], _.array.partitionMap(F.identity)), {
      left: [],
      right: []
    })
    assert.deepStrictEqual(
      pipe([E.right(1), E.left("foo"), E.right(2)], _.array.partitionMap(F.identity)),
      {
        left: ["foo"],
        right: [1, 2]
      }
    )
  })

  it("partition", () => {
    const { partition } = _.array
    assert.deepStrictEqual(partition((n: number) => n > 2)([]), { left: [], right: [] })
    assert.deepStrictEqual(partition((n: number) => n > 2)([1, 3]), {
      left: [1],
      right: [3]
    })
    // refinements
    const xs: _.Array<string | number> = ["a", "b", 1]
    const isNumber = (x: string | number): x is number => typeof x === "number"
    const actual = pipe(xs, partition(isNumber))
    assert.deepStrictEqual(actual, { left: ["a", "b"], right: [1] })
  })

  it("wither", () => {
    const witherIdentity = _.array.wither(I.identity)
    const f = (n: number) => I.identity.of(n > 2 ? O.some(n + 1) : O.none)
    assert.deepStrictEqual(witherIdentity(f)([]), I.identity.of([]))
    assert.deepStrictEqual(witherIdentity(f)([1, 3]), I.identity.of([4]))
  })

  it("wilt", () => {
    const wiltIdentity = _.array.wilt(I.identity)
    const f = (n: number) => I.identity.of(n > 2 ? E.right(n + 1) : E.left(n - 1))
    assert.deepStrictEqual(wiltIdentity(f)([]), I.identity.of({ left: [], right: [] }))
    assert.deepStrictEqual(
      wiltIdentity(f)([1, 3]),
      I.identity.of({ left: [0], right: [4] })
    )
  })

  it("chop", () => {
    const group = <A>(E: Eq.Eq<A>): ((as: _.Array<A>) => _.Array<_.Array<A>>) => {
      return _.chop((as) => {
        const { init, rest } = _.spanLeft((a: A) => E.equals(a, as[0]))(as)
        return [init, rest]
      })
    }
    assert.deepStrictEqual(group(Eq.eqNumber)([1, 1, 2, 3, 3, 4]), [
      [1, 1],
      [2],
      [3, 3],
      [4]
    ])
  })

  it("splitAt", () => {
    assert.deepStrictEqual(_.splitAt(2)([1, 2, 3, 4, 5]), [
      [1, 2],
      [3, 4, 5]
    ])
    assert.deepStrictEqual(_.splitAt(2)([]), [[], []])
    assert.deepStrictEqual(_.splitAt(2)([1]), [[1], []])
    assert.deepStrictEqual(_.splitAt(2)([1, 2]), [[1, 2], []])
    assert.deepStrictEqual(_.splitAt(-1)([1, 2]), [[1], [2]])
    assert.deepStrictEqual(_.splitAt(0)([1, 2]), [[], [1, 2]])
    assert.deepStrictEqual(_.splitAt(3)([1, 2]), [[1, 2], []])
  })

  describe("chunksOf", () => {
    it("should split an array into length-n pieces", () => {
      assert.deepStrictEqual(_.chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
      assert.deepStrictEqual(_.chunksOf(2)([1, 2, 3, 4, 5, 6]), [
        [1, 2],
        [3, 4],
        [5, 6]
      ])
      assert.deepStrictEqual(_.chunksOf(5)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(_.chunksOf(6)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      assert.deepStrictEqual(_.chunksOf(1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
      assert.deepStrictEqual(_.chunksOf(0)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(_.chunksOf(10)([1, 2]), [[1, 2]])
      assert.deepStrictEqual(_.chunksOf(-1)([1, 2]), [[1, 2]])
    })

    // #897
    it("returns an empty array if provided an empty array", () => {
      assert.deepStrictEqual(_.chunksOf(1)([]), [])
      assert.deepStrictEqual(_.chunksOf(2)([]), [])
      assert.deepStrictEqual(_.chunksOf(0)([]), [])
    })

    // #897
    it("should respect the law: RA.chunksOf(n)(xs).concat(RA.chunksOf(n)(ys)) == RA.chunksOf(n)(xs.concat(ys)))", () => {
      const xs: _.Array<number> = []
      const ys: _.Array<number> = [1, 2]
      assert.deepStrictEqual(
        _.chunksOf(2)(xs).concat(_.chunksOf(2)(ys)),
        _.chunksOf(2)(xs.concat(ys))
      )
      fc.assert(
        fc.property(
          fc.array(fc.integer()).filter((xs) => xs.length % 2 === 0), // Ensures `xs.length` is even
          fc.array(fc.integer()),
          fc.integer(1, 1).map((x) => x * 2), // Generates `n` to be even so that it evenly divides `xs`
          (xs, ys, n) => {
            const as = _.chunksOf(n)(xs).concat(_.chunksOf(n)(ys))
            const bs = _.chunksOf(n)(xs.concat(ys))
            isDeepStrictEqual(as, bs)
          }
        )
      )
    })
  })

  it("makeBy", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(_.makeBy(5, double), [0, 2, 4, 6, 8])
  })

  it("range", () => {
    assert.deepStrictEqual(_.range(0, 0), [0])
    assert.deepStrictEqual(_.range(1, 5), [1, 2, 3, 4, 5])
    assert.deepStrictEqual(_.range(10, 15), [10, 11, 12, 13, 14, 15])
  })

  it("replicate", () => {
    assert.deepStrictEqual(_.replicate(0, "a"), [])
    assert.deepStrictEqual(_.replicate(3, "a"), ["a", "a", "a"])
  })

  it("comprehension", () => {
    assert.deepStrictEqual(
      _.comprehension([[1, 2, 3]], (a) => a * 2),
      [2, 4, 6]
    )
    assert.deepStrictEqual(
      _.comprehension(
        [
          [1, 2, 3],
          ["a", "b"]
        ],
        F.tuple
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
      _.comprehension(
        [
          [1, 2, 3],
          ["a", "b"]
        ],
        F.tuple,
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
      pipe(
        ["a", "b"],
        _.array.reduceWithIndex("", (i, b, a) => b + i + a)
      ),
      "0a1b"
    )
  })

  it("foldMapWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        _.array.foldMapWithIndex(M.monoidString)((i, a) => i + a)
      ),
      "0a1b"
    )
  })

  it("reduceRightWithIndex", () => {
    assert.deepStrictEqual(
      pipe(
        ["a", "b"],
        _.array.reduceRightWithIndex("", (i, a, b) => b + i + a)
      ),
      "1b0a"
    )
  })

  it("traverseWithIndex", () => {
    const ta: _.Array<string> = ["a", "bb"]
    assert.deepStrictEqual(
      pipe(
        ta,
        _.array.traverseWithIndex(O.option)((i, s) =>
          s.length >= 1 ? O.some(s + i) : O.none
        )
      ),
      O.some(["a0", "bb1"])
    )
    assert.deepStrictEqual(
      pipe(
        ta,
        _.array.traverseWithIndex(O.option)((i, s) =>
          s.length > 1 ? O.some(s + i) : O.none
        )
      ),
      O.none
    )

    // FoldableWithIndex compatibility
    const f = (i: number, s: string): string => s + i
    assert.deepStrictEqual(
      pipe(ta, _.array.foldMapWithIndex(M.monoidString)(f)),
      pipe(
        ta,
        _.array.traverseWithIndex(C.getApplicative(M.monoidString))((i, a) =>
          C.make(f(i, a))
        )
      )
    )

    // FunctorWithIndex compatibility
    assert.deepStrictEqual(
      pipe(ta, _.array.mapWithIndex(f)),
      pipe(
        ta,
        _.array.traverseWithIndex(I.identity)((i, a) => I.identity.of(f(i, a)))
      )
    )
  })

  it("union", () => {
    assert.deepStrictEqual(_.union(Eq.eqNumber)([1, 2], [3, 4]), [1, 2, 3, 4])
    assert.deepStrictEqual(_.union(Eq.eqNumber)([1, 2], [2, 3]), [1, 2, 3])
    assert.deepStrictEqual(_.union(Eq.eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("intersection", () => {
    assert.deepStrictEqual(_.intersection(Eq.eqNumber)([1, 2], [3, 4]), [])
    assert.deepStrictEqual(_.intersection(Eq.eqNumber)([1, 2], [2, 3]), [2])
    assert.deepStrictEqual(_.intersection(Eq.eqNumber)([1, 2], [1, 2]), [1, 2])
  })

  it("difference", () => {
    assert.deepStrictEqual(_.difference(Eq.eqNumber)([1, 2], [3, 4]), [1, 2])
    assert.deepStrictEqual(_.difference(Eq.eqNumber)([1, 2], [2, 3]), [1])
    assert.deepStrictEqual(_.difference(Eq.eqNumber)([1, 2], [1, 2]), [])
  })

  it("should be safe when calling map with a binary function", () => {
    interface Foo {
      readonly bar: () => number
    }
    const f = (a: number, x?: Foo) => (x !== undefined ? `${a}${x.bar()}` : `${a}`)
    const res = _.array.map(f)([1, 2])
    assert.deepStrictEqual(res, ["1", "2"])
  })

  it("getShow", () => {
    const S = _.getShow(showString)
    assert.deepStrictEqual(S.show([]), `[]`)
    assert.deepStrictEqual(S.show(["a"]), `["a"]`)
    assert.deepStrictEqual(S.show(["a", "b"]), `["a", "b"]`)
  })

  it("fromArray", () => {
    assert.strictEqual(_.fromMutable([]), _.empty)
    // tslint:disable-next-line: readonly-array
    const as = [1, 2, 3]
    const bs = _.fromMutable(as)
    assert.deepStrictEqual(bs, as)
    assert.notStrictEqual(bs, as)
  })

  it("toArray", () => {
    assert.deepStrictEqual(_.toMutable(_.empty), [])
    assert.notStrictEqual(_.toMutable(_.empty), _.empty)
    // tslint:disable-next-line: readonly-array
    const as = [1, 2, 3]
    const bs = _.toMutable(as)
    assert.deepStrictEqual(bs, as)
    assert.notStrictEqual(bs, as)
  })
})
