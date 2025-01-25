import * as RA from "effect/Array"
import * as E from "effect/Either"
import * as fc from "effect/FastCheck"
import { identity, pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as O from "effect/Option"
import * as Order from "effect/Order"
import type { Predicate } from "effect/Predicate"
import * as String from "effect/String"
import { deepStrictEqual, strictEqual } from "effect/test/util"
import * as Util from "effect/test/util"
import { assert, describe, expect, it } from "vitest"

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

const double = (n: number) => n * 2

describe("Array", () => {
  it("exports", () => {
    expect(RA.fromRecord).exist
    expect(RA.getEquivalence).exist
  })

  it("of", () => {
    expect(RA.of(1)).toEqual([1])
  })

  it("fromIterable/Array should return the same reference if the iterable is an Array", () => {
    const i = [1, 2, 3]
    expect(RA.fromIterable(i) === i).toEqual(true)
  })

  it("fromIterable/Iterable", () => {
    expect(RA.fromIterable(new Set([1, 2, 3]))).toEqual([1, 2, 3])
  })

  it("ensure", () => {
    expect(RA.ensure(1)).toEqual([1])
    expect(RA.ensure(null)).toEqual([null])
    expect(RA.ensure([1])).toEqual([1])
    expect(RA.ensure([1, 2])).toEqual([1, 2])
    expect(RA.ensure(new Set([1, 2]))).toEqual([new Set([1, 2])])
  })

  describe("iterable inputs", () => {
    it("prepend", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.prepend(0)), [0, 1, 2, 3])
      deepStrictEqual(pipe([[2]], RA.prepend([1])), [[1], [2]])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.prepend(0)), [0, 1, 2, 3])
      deepStrictEqual(pipe(new Set([[2]]), RA.prepend([1])), [[1], [2]])
    })

    it("prependAll", () => {
      deepStrictEqual(pipe([3, 4], RA.prependAll([1, 2])), [1, 2, 3, 4])

      deepStrictEqual(pipe([3, 4], RA.prependAll(new Set([1, 2]))), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([3, 4]), RA.prependAll([1, 2])), [1, 2, 3, 4])
    })

    it("append", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.append(4)), [1, 2, 3, 4])
      deepStrictEqual(pipe([[1]], RA.append([2])), [[1], [2]])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.append(4)), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([[1]]), RA.append([2])), [[1], [2]])
    })

    it("appendAll", () => {
      deepStrictEqual(pipe([1, 2], RA.appendAll([3, 4])), [1, 2, 3, 4])

      deepStrictEqual(pipe([1, 2], RA.appendAll(new Set([3, 4]))), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([1, 2]), RA.appendAll([3, 4])), [1, 2, 3, 4])
    })

    it("scan", () => {
      const f = (b: number, a: number) => b - a
      deepStrictEqual(pipe([1, 2, 3], RA.scan(10, f)), [10, 9, 7, 4])
      deepStrictEqual(pipe([0], RA.scan(10, f)), [10, 10])
      deepStrictEqual(pipe([], RA.scan(10, f)), [10])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.scan(10, f)), [10, 9, 7, 4])
      deepStrictEqual(pipe(new Set([0]), RA.scan(10, f)), [10, 10])
      deepStrictEqual(pipe(new Set([]), RA.scan(10, f)), [10])
    })

    it("scanRight", () => {
      const f = (b: number, a: number) => a - b
      deepStrictEqual(pipe([1, 2, 3], RA.scanRight(10, f)), [-8, 9, -7, 10])
      deepStrictEqual(pipe([0], RA.scanRight(10, f)), [-10, 10])
      deepStrictEqual(pipe([], RA.scanRight(10, f)), [10])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.scanRight(10, f)), [-8, 9, -7, 10])
      deepStrictEqual(pipe(new Set([0]), RA.scanRight(10, f)), [-10, 10])
      deepStrictEqual(pipe(new Set([]), RA.scanRight(10, f)), [10])
    })

    it("tail", () => {
      deepStrictEqual(RA.tail([1, 2, 3]), O.some([2, 3]))
      deepStrictEqual(RA.tail([]), O.none())

      deepStrictEqual(RA.tail(new Set([1, 2, 3])), O.some([2, 3]))
      deepStrictEqual(RA.tail(new Set([])), O.none())
    })

    it("init", () => {
      deepStrictEqual(RA.init([1, 2, 3]), O.some([1, 2]))
      deepStrictEqual(RA.init([]), O.none())

      deepStrictEqual(RA.init(new Set([1, 2, 3])), O.some([1, 2]))
      deepStrictEqual(RA.init(new Set([])), O.none())
    })

    it("take", () => {
      expect(pipe([1, 2, 3, 4], RA.take(2))).toEqual([1, 2])
      expect(pipe([1, 2, 3, 4], RA.take(0))).toEqual([])
      // out of bounds
      expect(pipe([1, 2, 3, 4], RA.take(-10))).toEqual([])
      expect(pipe([1, 2, 3, 4], RA.take(10))).toEqual([1, 2, 3, 4])

      expect(pipe(new Set([1, 2, 3, 4]), RA.take(2))).toEqual([1, 2])
      expect(pipe(new Set([1, 2, 3, 4]), RA.take(0))).toEqual([])
      // out of bounds
      expect(pipe(new Set([1, 2, 3, 4]), RA.take(-10))).toEqual([])
      expect(pipe(new Set([1, 2, 3, 4]), RA.take(10))).toEqual([1, 2, 3, 4])
    })

    it("takeRight", () => {
      deepStrictEqual(pipe(RA.empty(), RA.takeRight(0)), [])
      deepStrictEqual(pipe([1, 2], RA.takeRight(0)), [])
      deepStrictEqual(pipe([1, 2], RA.takeRight(1)), [2])
      deepStrictEqual(pipe([1, 2], RA.takeRight(2)), [1, 2])
      // out of bound
      deepStrictEqual(pipe(RA.empty(), RA.takeRight(1)), [])
      deepStrictEqual(pipe(RA.empty(), RA.takeRight(-1)), [])
      deepStrictEqual(pipe([1, 2], RA.takeRight(3)), [1, 2])
      deepStrictEqual(pipe([1, 2], RA.takeRight(-1)), [])

      deepStrictEqual(pipe(new Set(), RA.takeRight(0)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.takeRight(0)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.takeRight(1)), [2])
      deepStrictEqual(pipe(new Set([1, 2]), RA.takeRight(2)), [1, 2])
      // out of bound
      deepStrictEqual(pipe(new Set(), RA.takeRight(1)), [])
      deepStrictEqual(pipe(new Set(), RA.takeRight(-1)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.takeRight(3)), [1, 2])
      deepStrictEqual(pipe(new Set([1, 2]), RA.takeRight(-1)), [])
    })

    it("takeWhile", () => {
      const f = (n: number) => n % 2 === 0
      deepStrictEqual(pipe([2, 4, 3, 6], RA.takeWhile(f)), [2, 4])
      deepStrictEqual(pipe(RA.empty(), RA.takeWhile(f)), [])
      deepStrictEqual(pipe([1, 2, 4], RA.takeWhile(f)), [])
      deepStrictEqual(pipe([2, 4], RA.takeWhile(f)), [2, 4])

      deepStrictEqual(pipe(new Set([2, 4, 3, 6]), RA.takeWhile(f)), [2, 4])
      deepStrictEqual(pipe(new Set<number>(), RA.takeWhile(f)), [])
      deepStrictEqual(pipe(new Set([1, 2, 4]), RA.takeWhile(f)), [])
      deepStrictEqual(pipe(new Set([2, 4]), RA.takeWhile(f)), [2, 4])
    })

    it("span", () => {
      const f = RA.span<number>((n) => n % 2 === 1)
      const assertSpan = (
        input: Iterable<number>,
        expectedInit: ReadonlyArray<number>,
        expectedRest: ReadonlyArray<number>
      ) => {
        const [init, rest] = f(input)
        deepStrictEqual(init, expectedInit)
        deepStrictEqual(rest, expectedRest)
      }
      assertSpan([1, 3, 2, 4, 5], [1, 3], [2, 4, 5])
      assertSpan(RA.empty(), RA.empty(), RA.empty())
      assertSpan([1, 3], [1, 3], RA.empty())
      assertSpan([2, 4], RA.empty(), [2, 4])

      assertSpan(new Set([1, 3, 2, 4, 5]), [1, 3], [2, 4, 5])
      assertSpan(new Set(), RA.empty(), RA.empty())
      assertSpan(new Set([1, 3]), [1, 3], RA.empty())
      assertSpan(new Set([2, 4]), RA.empty(), [2, 4])
    })

    it("splitWhere", () => {
      const f = RA.splitWhere<number>((n) => n % 2 !== 1)
      const assertSplitWhere = (
        input: Iterable<number>,
        expectedInit: ReadonlyArray<number>,
        expectedRest: ReadonlyArray<number>
      ) => {
        const [init, rest] = f(input)
        deepStrictEqual(init, expectedInit)
        deepStrictEqual(rest, expectedRest)
      }
      assertSplitWhere([1, 3, 2, 4, 5], [1, 3], [2, 4, 5])
      assertSplitWhere(RA.empty(), RA.empty(), RA.empty())
      assertSplitWhere([1, 3], [1, 3], RA.empty())
      assertSplitWhere([2, 4], RA.empty(), [2, 4])

      assertSplitWhere(new Set([1, 3, 2, 4, 5]), [1, 3], [2, 4, 5])
      assertSplitWhere(new Set(), RA.empty(), RA.empty())
      assertSplitWhere(new Set([1, 3]), [1, 3], RA.empty())
      assertSplitWhere(new Set([2, 4]), RA.empty(), [2, 4])
    })

    it("split", () => {
      expect(pipe(RA.empty(), RA.split(2))).toEqual(RA.empty())
      expect(pipe(RA.make(1), RA.split(2))).toEqual(
        RA.make(RA.make(1))
      )
      expect(pipe(RA.make(1, 2), RA.split(2))).toEqual(
        RA.make(RA.make(1), RA.make(2))
      )
      expect(pipe(RA.make(1, 2, 3, 4, 5), RA.split(2))).toEqual(
        RA.make(RA.make(1, 2, 3), RA.make(4, 5))
      )
      expect(pipe(RA.make(1, 2, 3, 4, 5), RA.split(3))).toEqual(
        RA.make(RA.make(1, 2), RA.make(3, 4), RA.make(5))
      )
    })

    it("drop", () => {
      deepStrictEqual(pipe(RA.empty(), RA.drop(0)), [])
      deepStrictEqual(pipe([1, 2], RA.drop(0)), [1, 2])
      deepStrictEqual(pipe([1, 2], RA.drop(1)), [2])
      deepStrictEqual(pipe([1, 2], RA.drop(2)), [])
      // out of bound
      deepStrictEqual(pipe(RA.empty(), RA.drop(1)), [])
      deepStrictEqual(pipe(RA.empty(), RA.drop(-1)), [])
      deepStrictEqual(pipe([1, 2], RA.drop(3)), [])
      deepStrictEqual(pipe([1, 2], RA.drop(-1)), [1, 2])

      deepStrictEqual(pipe(new Set(), RA.drop(0)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.drop(0)), [1, 2])
      deepStrictEqual(pipe(new Set([1, 2]), RA.drop(1)), [2])
      deepStrictEqual(pipe(new Set([1, 2]), RA.drop(2)), [])
      // out of bound
      deepStrictEqual(pipe(new Set(), RA.drop(1)), [])
      deepStrictEqual(pipe(new Set(), RA.drop(-1)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.drop(3)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.drop(-1)), [1, 2])
    })

    it("dropRight", () => {
      deepStrictEqual(pipe([], RA.dropRight(0)), [])
      deepStrictEqual(pipe([1, 2], RA.dropRight(0)), [1, 2])
      deepStrictEqual(pipe([1, 2], RA.dropRight(1)), [1])
      deepStrictEqual(pipe([1, 2], RA.dropRight(2)), [])
      // out of bound
      deepStrictEqual(pipe([], RA.dropRight(1)), [])
      deepStrictEqual(pipe([1, 2], RA.dropRight(3)), [])
      deepStrictEqual(pipe([], RA.dropRight(-1)), [])
      deepStrictEqual(pipe([1, 2], RA.dropRight(-1)), [1, 2])

      deepStrictEqual(pipe(new Set(), RA.dropRight(0)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.dropRight(0)), [1, 2])
      deepStrictEqual(pipe(new Set([1, 2]), RA.dropRight(1)), [1])
      deepStrictEqual(pipe(new Set([1, 2]), RA.dropRight(2)), [])
      // out of bound
      deepStrictEqual(pipe(new Set(), RA.dropRight(1)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.dropRight(3)), [])
      deepStrictEqual(pipe(new Set(), RA.dropRight(-1)), [])
      deepStrictEqual(pipe(new Set([1, 2]), RA.dropRight(-1)), [1, 2])
    })

    it("dropWhile", () => {
      const f = RA.dropWhile<number>((n) => n > 0)

      deepStrictEqual(f([]), [])
      deepStrictEqual(f([1, 2]), RA.empty())
      deepStrictEqual(f([-1, -2]), [-1, -2])
      deepStrictEqual(f([-1, 2]), [-1, 2])
      deepStrictEqual(f([1, -2, 3]), [-2, 3])

      deepStrictEqual(f(new Set<number>()), [])
      deepStrictEqual(f(new Set([1, 2])), RA.empty())
      deepStrictEqual(f(new Set([-1, -2])), [-1, -2])
      deepStrictEqual(f(new Set([-1, 2])), [-1, 2])
      deepStrictEqual(f(new Set([1, -2, 3])), [-2, 3])
    })

    it("findFirstIndex", () => {
      deepStrictEqual(pipe([], RA.findFirstIndex((n) => n % 2 === 0)), O.none())
      deepStrictEqual(pipe([1, 2, 3], RA.findFirstIndex((n) => n % 2 === 0)), O.some(1))
      deepStrictEqual(pipe([1, 2, 3, 1], RA.findFirstIndex((n) => n % 2 === 0)), O.some(1))

      deepStrictEqual(pipe(new Set<number>(), RA.findFirstIndex((n) => n % 2 === 0)), O.none())
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.findFirstIndex((n) => n % 2 === 0)), O.some(1))
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), RA.findFirstIndex((n) => n % 2 === 0)), O.some(1))
    })

    it("findLastIndex", () => {
      deepStrictEqual(pipe([], RA.findLastIndex((n) => n % 2 === 0)), O.none())
      deepStrictEqual(pipe([1, 2, 3], RA.findLastIndex((n) => n % 2 === 0)), O.some(1))
      deepStrictEqual(pipe([1, 2, 3, 4], RA.findLastIndex((n) => n % 2 === 0)), O.some(3))

      deepStrictEqual(pipe(new Set<number>(), RA.findLastIndex((n) => n % 2 === 0)), O.none())
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.findLastIndex((n) => n % 2 === 0)), O.some(1))
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), RA.findLastIndex((n) => n % 2 === 0)), O.some(3))
    })

    describe("findFirst", () => {
      it("boolean-returning overloads", () => {
        deepStrictEqual(pipe([], RA.findFirst((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe([1, 2, 3], RA.findFirst((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe([1, 2, 3, 4], RA.findFirst((n) => n % 2 === 0)), O.some(2))

        deepStrictEqual(pipe(new Set<number>(), RA.findFirst((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe(new Set([1, 2, 3]), RA.findFirst((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe(new Set([1, 2, 3, 4]), RA.findFirst((n) => n % 2 === 0)), O.some(2))
      })

      it("Option-returning overloads", () => {
        deepStrictEqual(pipe([], RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())), O.none())
        deepStrictEqual(
          pipe([1, 2, 3], RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe([1, 2, 3, 4], RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )

        deepStrictEqual(
          pipe(new Set<number>(), RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.none()
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3]), RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3, 4]), RA.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
      })
    })

    describe("findLast", () => {
      it("boolean-returning overloads", () => {
        deepStrictEqual(pipe([], RA.findLast((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe([1, 2, 3], RA.findLast((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe([1, 2, 3, 4], RA.findLast((n) => n % 2 === 0)), O.some(4))

        deepStrictEqual(pipe(new Set<number>(), RA.findLast((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe(new Set([1, 2, 3]), RA.findLast((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe(new Set([1, 2, 3, 4]), RA.findLast((n) => n % 2 === 0)), O.some(4))
      })

      it("Option-returning overloads", () => {
        deepStrictEqual(pipe([], RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())), O.none())
        deepStrictEqual(
          pipe([1, 2, 3], RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe([1, 2, 3, 4], RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([4, 3])
        )

        deepStrictEqual(
          pipe(new Set<number>(), RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.none()
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3]), RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3, 4]), RA.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([4, 3])
        )
      })
    })

    it("insertAt", () => {
      deepStrictEqual(RA.insertAt(1, 1)([]), O.none())
      deepStrictEqual(RA.insertAt(0, 1)([]), O.some([1]))
      deepStrictEqual(RA.insertAt(2, 5)([1, 2, 3, 4]), O.some([1, 2, 5, 3, 4]))
      // out of bound
      deepStrictEqual(RA.insertAt(-1, 5)([1, 2, 3, 4]), O.none())
      deepStrictEqual(RA.insertAt(10, 5)([1, 2, 3, 4]), O.none())

      deepStrictEqual(RA.insertAt(1, 1)(new Set([])), O.none())
      deepStrictEqual(RA.insertAt(0, 1)(new Set([])), O.some([1]))
      deepStrictEqual(RA.insertAt(2, 5)(new Set([1, 2, 3, 4])), O.some([1, 2, 5, 3, 4]))
      // out of bound
      deepStrictEqual(RA.insertAt(-1, 5)(new Set([1, 2, 3, 4])), O.none())
      deepStrictEqual(RA.insertAt(10, 5)(new Set([1, 2, 3, 4])), O.none())
    })

    it("replace", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.replace(1, "a")), [1, "a", 3])
      // out of bound
      deepStrictEqual(pipe([], RA.replace(1, "a")), [])
      deepStrictEqual(pipe([1, 2, 3], RA.replace(-1, "a")), [1, 2, 3])
      deepStrictEqual(pipe([1, 2, 3], RA.replace(10, "a")), [1, 2, 3])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replace(1, "a")), [1, "a", 3])
      // out of bound
      deepStrictEqual(pipe(new Set([]), RA.replace(1, "a")), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replace(-1, "a")), [1, 2, 3])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replace(10, "a")), [1, 2, 3])
    })

    it("replaceOption", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.replaceOption(1, "a")), O.some([1, "a", 3]))
      // out of bound
      deepStrictEqual(pipe([], RA.replaceOption(1, "a")), O.none())
      deepStrictEqual(pipe([1, 2, 3], RA.replaceOption(-1, "a")), O.none())
      deepStrictEqual(pipe([1, 2, 3], RA.replaceOption(10, "a")), O.none())

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replaceOption(1, "a")), O.some([1, "a", 3]))
      // out of bound
      deepStrictEqual(pipe(new Set([]), RA.replaceOption(1, "a")), O.none())
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replaceOption(-1, "a")), O.none())
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.replaceOption(10, "a")), O.none())
    })

    it("modify", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.modify(1, double)), [1, 4, 3])
      // out of bound
      deepStrictEqual(pipe([], RA.modify(1, double)), [])
      deepStrictEqual(pipe([1, 2, 3], RA.modify(10, double)), [1, 2, 3])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.modify(1, double)), [1, 4, 3])
      // out of bound
      deepStrictEqual(pipe(new Set([]), RA.modify(1, double)), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.modify(10, double)), [1, 2, 3])
    })

    it("modifyOption", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.modifyOption(1, double)), O.some([1, 4, 3]))
      // out of bound
      deepStrictEqual(pipe([], RA.modifyOption(1, double)), O.none())
      deepStrictEqual(pipe([1, 2, 3], RA.modifyOption(10, double)), O.none())

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.modifyOption(1, double)), O.some([1, 4, 3]))
      // out of bound
      deepStrictEqual(pipe(new Set([]), RA.modifyOption(1, double)), O.none())
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.modifyOption(10, double)), O.none())
    })

    it("remove", () => {
      deepStrictEqual(pipe([1, 2, 3], RA.remove(0)), [2, 3])
      // out of bound
      deepStrictEqual(pipe([], RA.remove(0)), [])
      deepStrictEqual(pipe([1, 2, 3], RA.remove(-1)), [1, 2, 3])
      deepStrictEqual(pipe([1, 2, 3], RA.remove(10)), [1, 2, 3])

      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.remove(0)), [2, 3])
      // out of bound
      deepStrictEqual(pipe(new Set([]), RA.remove(0)), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.remove(-1)), [1, 2, 3])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.remove(10)), [1, 2, 3])
    })

    it("reverse", () => {
      deepStrictEqual(RA.reverse([]), [])
      deepStrictEqual(RA.reverse([1]), [1])
      deepStrictEqual(RA.reverse([1, 2, 3]), [3, 2, 1])

      deepStrictEqual(RA.reverse(new Set([])), [])
      deepStrictEqual(RA.reverse(new Set([1])), [1])
      deepStrictEqual(RA.reverse(new Set([1, 2, 3])), [3, 2, 1])
    })

    it("sort", () => {
      deepStrictEqual(RA.sort(Number.Order)([]), [])
      deepStrictEqual(RA.sort(Number.Order)([1, 3, 2]), [1, 2, 3])

      deepStrictEqual(RA.sort(Number.Order)(new Set<number>()), [])
      deepStrictEqual(RA.sort(Number.Order)(new Set([1, 3, 2])), [1, 2, 3])
    })

    it("zip", () => {
      deepStrictEqual(pipe(new Set([]), RA.zip(new Set(["a", "b", "c", "d"]))), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.zip(new Set([]))), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.zip(new Set(["a", "b", "c", "d"]))), [
        [1, "a"],
        [2, "b"],
        [3, "c"]
      ])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.zip(new Set(["a", "b", "c", "d"]))), [
        [1, "a"],
        [2, "b"],
        [3, "c"]
      ])
    })

    it("zipWith", () => {
      deepStrictEqual(
        pipe(new Set([1, 2, 3]), RA.zipWith(new Set([]), (n, s) => s + n)),
        []
      )
      deepStrictEqual(
        pipe(new Set([]), RA.zipWith(new Set(["a", "b", "c", "d"]), (n, s) => s + n)),
        []
      )
      deepStrictEqual(
        pipe(new Set([]), RA.zipWith(new Set([]), (n, s) => s + n)),
        []
      )
      deepStrictEqual(
        pipe(new Set([1, 2, 3]), RA.zipWith(new Set(["a", "b", "c", "d"]), (n, s) => s + n)),
        ["a1", "b2", "c3"]
      )
    })

    it("unzip", () => {
      deepStrictEqual(RA.unzip(new Set([])), [[], []])
      deepStrictEqual(
        RA.unzip(
          new Set(
            [
              [1, "a"],
              [2, "b"],
              [3, "c"]
            ] as const
          )
        ),
        [
          [1, 2, 3],
          ["a", "b", "c"]
        ]
      )
    })

    it("intersperse", () => {
      deepStrictEqual(pipe([], RA.intersperse(0)), [])
      deepStrictEqual(pipe([1], RA.intersperse(0)), [1])
      deepStrictEqual(pipe([1, 2, 3], RA.intersperse(0)), [1, 0, 2, 0, 3])
      deepStrictEqual(pipe([1, 2], RA.intersperse(0)), [1, 0, 2])
      deepStrictEqual(pipe([1, 2, 3, 4], RA.intersperse(0)), [1, 0, 2, 0, 3, 0, 4])

      deepStrictEqual(pipe(new Set([]), RA.intersperse(0)), [])
      deepStrictEqual(pipe(new Set([1]), RA.intersperse(0)), [1])
      deepStrictEqual(pipe(new Set([1, 2, 3]), RA.intersperse(0)), [1, 0, 2, 0, 3])
      deepStrictEqual(pipe(new Set([1, 2]), RA.intersperse(0)), [1, 0, 2])
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), RA.intersperse(0)), [1, 0, 2, 0, 3, 0, 4])
    })

    it("rotate", () => {
      deepStrictEqual(RA.rotate(0)(RA.empty()), RA.empty())
      deepStrictEqual(RA.rotate(1)(RA.empty()), RA.empty())
      deepStrictEqual(RA.rotate(1)([1]), [1])
      deepStrictEqual(RA.rotate(2)([1]), [1])
      deepStrictEqual(RA.rotate(-1)([1]), [1])
      deepStrictEqual(RA.rotate(-2)([1]), [1])
      deepStrictEqual(RA.rotate(2)([1, 2]), [1, 2])
      deepStrictEqual(RA.rotate(0)([1, 2]), [1, 2])
      deepStrictEqual(RA.rotate(-2)([1, 2]), [1, 2])
      deepStrictEqual(RA.rotate(1)([1, 2]), [2, 1])
      deepStrictEqual(RA.rotate(1)(new Set([1, 2, 3, 4, 5])), [5, 1, 2, 3, 4])
      deepStrictEqual(RA.rotate(2)(new Set([1, 2, 3, 4, 5])), [4, 5, 1, 2, 3])
      deepStrictEqual(RA.rotate(-1)(new Set([1, 2, 3, 4, 5])), [2, 3, 4, 5, 1])
      deepStrictEqual(RA.rotate(-2)(new Set([1, 2, 3, 4, 5])), [3, 4, 5, 1, 2])
      // out of bounds
      deepStrictEqual(RA.rotate(7)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
      deepStrictEqual(RA.rotate(-7)([1, 2, 3, 4, 5]), [3, 4, 5, 1, 2])
      deepStrictEqual(RA.rotate(2.2)([1, 2, 3, 4, 5]), [4, 5, 1, 2, 3])
      deepStrictEqual(RA.rotate(-2.2)([1, 2, 3, 4, 5]), [3, 4, 5, 1, 2])
    })

    it("containsWith", () => {
      const contains = RA.containsWith(Number.Equivalence)
      deepStrictEqual(pipe([1, 2, 3], contains(2)), true)
      deepStrictEqual(pipe([1, 2, 3], contains(0)), false)

      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(2)), true)
      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(0)), false)
    })

    it("contains", () => {
      const contains = RA.contains
      deepStrictEqual(pipe([1, 2, 3], contains(2)), true)
      deepStrictEqual(pipe([1, 2, 3], contains(0)), false)

      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(2)), true)
      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(0)), false)
    })

    it("dedupeWith", () => {
      const dedupe = RA.dedupeWith(Number.Equivalence)
      deepStrictEqual(dedupe([]), [])
      deepStrictEqual(dedupe([-0, -0]), [-0])
      deepStrictEqual(dedupe([0, -0]), [0])
      deepStrictEqual(dedupe([1]), [1])
      deepStrictEqual(dedupe([2, 1, 2]), [2, 1])
      deepStrictEqual(dedupe([1, 2, 1]), [1, 2])
      deepStrictEqual(dedupe([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
      deepStrictEqual(dedupe([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]), [1, 2, 3, 4, 5])
      deepStrictEqual(dedupe([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]), [1, 2, 3, 4, 5])
    })

    it("dedupeAdjacentWith", () => {
      const dedupeAdjacent = RA.dedupeAdjacentWith(Number.Equivalence)
      expect(dedupeAdjacent([])).toEqual([])
      expect(dedupeAdjacent([1, 2, 3])).toEqual([1, 2, 3])
      expect(dedupeAdjacent([1, 2, 2, 3, 3])).toEqual([1, 2, 3])
    })

    it("splitAt", () => {
      const assertSplitAt = (
        input: ReadonlyArray<number>,
        index: number,
        expectedInit: ReadonlyArray<number>,
        expectedRest: ReadonlyArray<number>
      ) => {
        const [init, rest] = RA.splitAt(index)(input)
        deepStrictEqual(init, expectedInit)
        deepStrictEqual(rest, expectedRest)
      }
      deepStrictEqual(RA.splitAt(1)([1, 2]), [[1], [2]])
      assertSplitAt([1, 2], 2, [1, 2], [])
      deepStrictEqual(RA.splitAt(2)([1, 2, 3, 4, 5]), [
        [1, 2],
        [3, 4, 5]
      ])
      deepStrictEqual(RA.splitAt(2)(new Set([1, 2, 3, 4, 5])), [
        [1, 2],
        [3, 4, 5]
      ])
      assertSplitAt([], 0, [], [])
      assertSplitAt([1, 2], 0, [], [1, 2])

      // out of bounds
      assertSplitAt([], -1, [], [])
      assertSplitAt([1, 2], -1, [], [1, 2])
      assertSplitAt([1, 2], 3, [1, 2], [])
      assertSplitAt([], 3, [], [])
    })
  })

  it("splitNonEmptyAt", () => {
    deepStrictEqual(pipe(RA.make(1, 2, 3, 4), RA.splitNonEmptyAt(2)), [[1, 2], [3, 4]])
    deepStrictEqual(pipe(RA.make(1, 2, 3, 4), RA.splitNonEmptyAt(10)), [[1, 2, 3, 4], []])
  })

  describe("unsafeGet", () => {
    it("should throw on index out of bound", () => {
      expect(() => pipe([], RA.unsafeGet(100))).toThrowError(new Error("Index 100 out of bounds"))
    })
  })

  it("fromNullable", () => {
    deepStrictEqual(RA.fromNullable(undefined), [])
    deepStrictEqual(RA.fromNullable(null), [])
    deepStrictEqual(RA.fromNullable(1), [1])
  })

  it("liftNullable", () => {
    const f = RA.liftNullable((n: number) => (n > 0 ? n : null))
    deepStrictEqual(f(1), [1])
    deepStrictEqual(f(-1), [])
  })

  it("flatMapNullable", () => {
    const f = RA.flatMapNullable((n: number) => (n > 0 ? n : null))
    deepStrictEqual(pipe([], f), [])
    deepStrictEqual(pipe([1], f), [1])
    deepStrictEqual(pipe([1, 2], f), [1, 2])
    deepStrictEqual(pipe([-1], f), [])
    deepStrictEqual(pipe([-1, 2], f), [2])
  })

  it("liftPredicate", () => {
    const p = (n: number): boolean => n > 2
    const f = RA.liftPredicate(p)
    deepStrictEqual(f(1), [])
    deepStrictEqual(f(3), [3])
  })

  it("liftOption", () => {
    const f = RA.liftOption((n: number) => (n > 0 ? O.some(n) : O.none()))
    deepStrictEqual(f(1), [1])
    deepStrictEqual(f(-1), [])
  })

  it("unprepend", () => {
    deepStrictEqual(RA.unprepend([0]), [0, []])
    deepStrictEqual(RA.unprepend([1, 2, 3, 4]), [1, [2, 3, 4]])
  })

  it("unappend", () => {
    deepStrictEqual(RA.unappend([0]), [[], 0])
    deepStrictEqual(RA.unappend([1, 2, 3, 4]), [
      RA.make(1, 2, 3),
      4
    ])
    deepStrictEqual(RA.unappend([0]), [[], 0])
    deepStrictEqual(RA.unappend([1, 2, 3, 4]), [
      RA.make(1, 2, 3),
      4
    ])
  })

  it("modifyNonEmptyHead", () => {
    const f = (s: string) => s + "!"
    deepStrictEqual(pipe(["a"], RA.modifyNonEmptyHead(f)), ["a!"])
    deepStrictEqual(pipe(["a", "b"], RA.modifyNonEmptyHead(f)), ["a!", "b"])
    deepStrictEqual(pipe(["a", "b", "c"], RA.modifyNonEmptyHead(f)), ["a!", "b", "c"])
  })

  it("modifyNonEmptyLast", () => {
    const f = (s: string) => s + "!"
    deepStrictEqual(pipe(["a"], RA.modifyNonEmptyLast(f)), ["a!"])
    deepStrictEqual(pipe(["a", "b"], RA.modifyNonEmptyLast(f)), ["a", "b!"])
    deepStrictEqual(pipe(["a", "b", "c"], RA.modifyNonEmptyLast(f)), ["a", "b", "c!"])
  })

  it("setNonEmptyHead", () => {
    deepStrictEqual(pipe(RA.make("a"), RA.setNonEmptyHead("d")), ["d"])
    deepStrictEqual(pipe(RA.make("a", "b"), RA.setNonEmptyHead("d")), ["d", "b"])
    deepStrictEqual(pipe(RA.make("a", "b", "c"), RA.setNonEmptyHead("d")), ["d", "b", "c"])
  })

  it("setNonEmptyLast", () => {
    deepStrictEqual(pipe(RA.make("a"), RA.setNonEmptyLast("d")), ["d"])
    deepStrictEqual(pipe(RA.make("a", "b"), RA.setNonEmptyLast("d")), ["a", "d"])
    deepStrictEqual(pipe(RA.make("a", "b", "c"), RA.setNonEmptyLast("d")), ["a", "b", "d"])
  })

  it("liftEither", () => {
    const f = RA.liftEither((s: string) => s.length > 2 ? E.right(s.length) : E.left("e"))
    deepStrictEqual(f("a"), [])
    deepStrictEqual(f("aaa"), [3])
  })

  it("headNonEmpty", () => {
    deepStrictEqual(RA.headNonEmpty(RA.make(1, 2)), 1)
  })

  it("tailNonEmpty", () => {
    deepStrictEqual(RA.tailNonEmpty(RA.make(1, 2)), [2])
  })

  it("lastNonEmpty", () => {
    deepStrictEqual(RA.lastNonEmpty(RA.make(1, 2, 3)), 3)
    deepStrictEqual(RA.lastNonEmpty([1]), 1)
  })

  it("initNonEmpty", () => {
    deepStrictEqual(
      RA.initNonEmpty(RA.make(1, 2, 3)),
      RA.make(1, 2)
    )
    deepStrictEqual(RA.initNonEmpty([1]), [])
  })

  it("get", () => {
    deepStrictEqual(pipe([1, 2, 3], RA.get(0)), O.some(1))
    deepStrictEqual(pipe([1, 2, 3], RA.get(3)), O.none())
  })

  it("unfold", () => {
    const as = RA.unfold(5, (n) => (n > 0 ? O.some([n, n - 1]) : O.none()))
    deepStrictEqual(as, [5, 4, 3, 2, 1])
  })

  it("map", () => {
    deepStrictEqual(
      pipe([1, 2, 3], RA.map((n) => n * 2)),
      [2, 4, 6]
    )
    deepStrictEqual(
      pipe(["a", "b"], RA.map((s, i) => s + i)),
      ["a0", "b1"]
    )
  })

  it("flatMap", () => {
    deepStrictEqual(
      pipe([1, 2, 3], RA.flatMap((n) => [n, n + 1])),
      [1, 2, 2, 3, 3, 4]
    )
    const f = RA.flatMap((n: number, i) => [n + i])
    deepStrictEqual(pipe([], f), [])
    deepStrictEqual(pipe([1, 2, 3], f), [1, 3, 5])
  })

  it("extend", () => {
    deepStrictEqual(pipe([1, 2, 3, 4], RA.extend(Number.sumAll)), [10, 9, 7, 4])
    deepStrictEqual(pipe([1, 2, 3, 4], RA.extend(identity)), [
      [1, 2, 3, 4],
      [2, 3, 4],
      [3, 4],
      [4]
    ])
  })

  it("compact", () => {
    assert.deepStrictEqual(RA.getSomes([]), [])
    assert.deepStrictEqual(RA.getSomes([O.some(1), O.some(2), O.some(3)]), [
      1,
      2,
      3
    ])
    assert.deepStrictEqual(RA.getSomes([O.some(1), O.none(), O.some(3)]), [
      1,
      3
    ])
  })

  it("separate", () => {
    expect(RA.separate([])).toEqual([[], []])
    expect(RA.separate([E.right(1), E.left("e"), E.left(2), E.right(2)])).toEqual([
      ["e", 2],
      [1, 2]
    ])
  })

  it("filter", () => {
    deepStrictEqual(RA.filter([1, 2, 3], (n) => n % 2 === 1), [1, 3])
    deepStrictEqual(RA.filter([O.some(3), O.some(2), O.some(1)], O.isSome), [O.some(3), O.some(2), O.some(1)])
    deepStrictEqual(RA.filter([O.some(3), O.none(), O.some(1)], O.isSome), [O.some(3), O.some(1)])
    deepStrictEqual(RA.filter(["a", "b", "c"], (_, i) => i % 2 === 0), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? O.none() : O.some(n))
    deepStrictEqual(pipe([1, 2, 3], RA.filterMap(f)), [1, 3])
    deepStrictEqual(pipe([], RA.filterMap(f)), [])
    const g = (n: number, i: number) => ((i + n) % 2 === 0 ? O.none() : O.some(n))
    deepStrictEqual(pipe([1, 2, 4], RA.filterMap(g)), [1, 2])
    deepStrictEqual(pipe([], RA.filterMap(g)), [])
  })

  it("partitionMap", () => {
    expect(RA.partitionMap([], identity)).toEqual([[], []])
    expect(RA.partitionMap([E.right(1), E.left("a"), E.right(2)], identity)).toEqual([["a"], [1, 2]])
  })

  it("partition", () => {
    expect(RA.partition([], (n) => n > 2)).toEqual([[], []])
    expect(RA.partition([1, 3], (n) => n > 2)).toEqual([[1], [3]])

    expect(RA.partition([], (n, i) => n + i > 2)).toEqual([[], []])
    expect(RA.partition([1, 2], (n, i) => n + i > 2)).toEqual([[1], [2]])
  })

  it("reduce", () => {
    deepStrictEqual(pipe(["a", "b", "c"], RA.reduce("", (b, a) => b + a)), "abc")
    deepStrictEqual(
      pipe(
        ["a", "b"],
        RA.reduce("", (b, a, i) => b + i + a)
      ),
      "0a1b"
    )
  })

  it("reduceRight", () => {
    const f = (b: string, a: string) => b + a
    deepStrictEqual(pipe(["a", "b", "c"], RA.reduceRight("", f)), "cba")
    deepStrictEqual(pipe([], RA.reduceRight("", f)), "")
    deepStrictEqual(
      pipe(
        ["a", "b"],
        RA.reduceRight("", (b, a, i) => b + i + a)
      ),
      "1b0a"
    )
  })

  it("getOrder", () => {
    const O = RA.getOrder(String.Order)
    deepStrictEqual(O([], []), 0)
    deepStrictEqual(O(["a"], ["a"]), 0)

    deepStrictEqual(O(["a"], ["b"]), -1)
    deepStrictEqual(O(["b"], ["a"]), 1)

    deepStrictEqual(O([], ["a"]), -1)
    deepStrictEqual(O(["a"], []), 1)
    deepStrictEqual(O(["a"], ["a", "a"]), -1)
    deepStrictEqual(O(["b"], ["a", "a"]), 1)

    deepStrictEqual(O(["a", "a"], ["a", "a"]), 0)
    deepStrictEqual(O(["a", "b"], ["a", "b"]), 0)

    deepStrictEqual(O(["a", "b"], ["a", "a"]), 1)
    deepStrictEqual(O(["a", "a"], ["a", "b"]), -1)

    deepStrictEqual(O(["b", "a"], ["a", "b"]), 1)
    deepStrictEqual(O(["a", "a"], ["b", "a"]), -1)
    deepStrictEqual(O(["a", "b"], ["b", "a"]), -1)
    deepStrictEqual(O(["b", "a"], ["b", "b"]), -1)
    deepStrictEqual(O(["b", "b"], ["b", "a"]), 1)
  })

  it("isEmptyReadonlyArray", () => {
    deepStrictEqual(RA.isEmptyReadonlyArray([1, 2, 3]), false)
    deepStrictEqual(RA.isEmptyReadonlyArray([]), true)
  })

  it("isEmptyArray", () => {
    deepStrictEqual(RA.isEmptyArray([1, 2, 3]), false)
    deepStrictEqual(RA.isEmptyArray([]), true)
  })

  it("isNonEmptyReadonlyArray", () => {
    deepStrictEqual(RA.isNonEmptyReadonlyArray([1, 2, 3]), true)
    deepStrictEqual(RA.isNonEmptyReadonlyArray([]), false)
  })

  it("isNonEmptyArray", () => {
    deepStrictEqual(RA.isNonEmptyArray([1, 2, 3]), true)
    deepStrictEqual(RA.isNonEmptyArray([]), false)
  })

  it("head", () => {
    const as: ReadonlyArray<number> = [1, 2, 3]
    deepStrictEqual(RA.head(as), O.some(1))
    deepStrictEqual(RA.head([]), O.none())
  })

  it("last", () => {
    const as: ReadonlyArray<number> = [1, 2, 3]
    deepStrictEqual(RA.last(as), O.some(3))
    deepStrictEqual(RA.last([]), O.none())
  })

  it("chunksOf", () => {
    deepStrictEqual(RA.chunksOf(2)([1, 2, 3, 4, 5]), [
      RA.make(1, 2),
      [3, 4],
      [5]
    ])
    deepStrictEqual(RA.chunksOf(2)([1, 2, 3, 4, 5, 6]), [
      RA.make(1, 2),
      [3, 4],
      [5, 6]
    ])
    deepStrictEqual(RA.chunksOf(1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
    deepStrictEqual(RA.chunksOf(5)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
    // out of bounds
    deepStrictEqual(RA.chunksOf(0)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
    deepStrictEqual(RA.chunksOf(-1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])

    const assertSingleChunk = (
      input: RA.NonEmptyReadonlyArray<number>,
      n: number
    ) => {
      const chunks = RA.chunksOf(n)(input)
      strictEqual(chunks.length, 1)
      deepStrictEqual(RA.headNonEmpty(chunks), input)
    }
    // n = length
    assertSingleChunk(RA.make(1, 2), 2)
    // n out of bounds
    assertSingleChunk(RA.make(1, 2), 3)
  })

  it("min", () => {
    deepStrictEqual(RA.min(Number.Order)([2, 1, 3]), 1)
    deepStrictEqual(RA.min(Number.Order)([3]), 3)
  })

  it("max", () => {
    deepStrictEqual(
      RA.max(Number.Order)(RA.make(1, 2, 3)),
      3
    )
    deepStrictEqual(RA.max(Number.Order)([1]), 1)
  })

  it("flatten", () => {
    expect(RA.flatten([[1], [2], [3]])).toEqual([1, 2, 3])
  })

  it("groupWith", () => {
    const groupWith = RA.groupWith(Number.Equivalence)
    deepStrictEqual(groupWith([1, 2, 1, 1]), [[1], [2], [1, 1]])
    deepStrictEqual(groupWith([1, 2, 1, 1, 3]), [[1], [2], [1, 1], [3]])
  })

  it("groupBy", () => {
    deepStrictEqual(RA.groupBy((_) => "")([]), {})
    deepStrictEqual(RA.groupBy((a) => `${a}`)([1]), { "1": [1] })
    deepStrictEqual(
      RA.groupBy((s: string) => `${s.length}`)(["foo", "bar", "foobar"]),
      {
        "3": ["foo", "bar"],
        "6": ["foobar"]
      }
    )
    deepStrictEqual(RA.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC), {
      [symA]: ["a"],
      [symB]: ["b"]
    })
    deepStrictEqual(RA.groupBy(["a", "b", "c", "d"], (s) => s === "a" ? symA : s === "b" ? symB : symC), {
      [symA]: ["a"],
      [symB]: ["b"],
      [symC]: ["c", "d"]
    })
  })

  it("match", () => {
    const len: <A>(as: ReadonlyArray<A>) => number = RA.match({
      onEmpty: () => 0,
      onNonEmpty: (as) => 1 + len(as.slice(1))
    })
    deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("matchLeft", () => {
    const len: <A>(as: ReadonlyArray<A>) => number = RA.matchLeft({
      onEmpty: () => 0,
      onNonEmpty: (_, tail) => 1 + len(tail)
    })
    deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("matchRight", () => {
    const len: <A>(as: ReadonlyArray<A>) => number = RA.matchRight({
      onEmpty: () => 0,
      onNonEmpty: (init, _) => 1 + len(init)
    })
    deepStrictEqual(len([1, 2, 3]), 3)
  })

  it("sortBy", () => {
    interface X {
      readonly a: string
      readonly b: number
      readonly c: boolean
    }

    const byName = pipe(
      String.Order,
      Order.mapInput((p: { readonly a: string; readonly b: number }) => p.a)
    )

    const byAge = pipe(
      Number.Order,
      Order.mapInput((p: { readonly a: string; readonly b: number }) => p.b)
    )

    const sortByNameByAge = RA.sortBy(byName, byAge)

    const xs: RA.NonEmptyArray<X> = [
      { a: "a", b: 1, c: true },
      { a: "b", b: 3, c: true },
      { a: "c", b: 2, c: true },
      { a: "b", b: 2, c: true }
    ]

    deepStrictEqual(RA.sortBy()(xs), xs)
    deepStrictEqual(sortByNameByAge([]), [])
    deepStrictEqual(sortByNameByAge(xs), [
      { a: "a", b: 1, c: true },
      { a: "b", b: 2, c: true },
      { a: "b", b: 3, c: true },
      { a: "c", b: 2, c: true }
    ])

    deepStrictEqual(RA.sortBy()(new Set(xs)), xs)
    deepStrictEqual(sortByNameByAge(new Set([])), [])
    deepStrictEqual(sortByNameByAge(new Set(xs)), [
      { a: "a", b: 1, c: true },
      { a: "b", b: 2, c: true },
      { a: "b", b: 3, c: true },
      { a: "c", b: 2, c: true }
    ])

    const sortByAgeByName = RA.sortBy(byAge, byName)
    deepStrictEqual(sortByAgeByName(xs), [
      { a: "a", b: 1, c: true },
      { a: "b", b: 2, c: true },
      { a: "c", b: 2, c: true },
      { a: "b", b: 3, c: true }
    ])
  })

  it("copy", () => {
    expect(pipe([], RA.copy)).toEqual([])
    expect(pipe([1, 2, 3], RA.copy)).toEqual([1, 2, 3])
  })

  it("chop", () => {
    deepStrictEqual(pipe([], RA.chop((as) => [as[0] * 2, as.slice(1)])), [])
    deepStrictEqual(pipe([1, 2, 3], RA.chop((as) => [as[0] * 2, as.slice(1)])), [2, 4, 6])
  })

  it("pad", () => {
    deepStrictEqual(pipe([], RA.pad(0, 0)), [])
    deepStrictEqual(pipe([1, 2, 3], RA.pad(0, 0)), [])
    deepStrictEqual(pipe([1, 2, 3], RA.pad(2, 0)), [1, 2])
    deepStrictEqual(pipe([1, 2, 3], RA.pad(6, 0)), [1, 2, 3, 0, 0, 0])
    deepStrictEqual(pipe([1, 2, 3], RA.pad(-2, 0)), [])
  })

  describe("chunksOf", () => {
    it("should split a `ReadonlyArray` into length-n pieces", () => {
      deepStrictEqual(RA.chunksOf(2)([1, 2, 3, 4, 5]), [[1, 2], [3, 4], [5]])
      deepStrictEqual(RA.chunksOf(2)([1, 2, 3, 4, 5, 6]), [
        [1, 2],
        [3, 4],
        [5, 6]
      ])
      deepStrictEqual(RA.chunksOf(1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
      deepStrictEqual(RA.chunksOf(5)([1, 2, 3, 4, 5]), [[1, 2, 3, 4, 5]])
      // out of bounds
      deepStrictEqual(RA.chunksOf(0)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])
      deepStrictEqual(RA.chunksOf(-1)([1, 2, 3, 4, 5]), [[1], [2], [3], [4], [5]])

      const assertSingleChunk = (input: ReadonlyArray<number>, n: number) => {
        const chunks = RA.chunksOf(n)(input)
        deepStrictEqual(chunks.length, 1)
        deepStrictEqual(chunks[0], input)
      }
      // n = length
      assertSingleChunk([1, 2], 2)
      // n out of bounds
      assertSingleChunk([1, 2], 3)
    })

    it("returns an empty array if provided an empty array", () => {
      const empty: ReadonlyArray<number> = []
      deepStrictEqual(RA.chunksOf(0)(empty), RA.empty())
      deepStrictEqual(RA.chunksOf(0)(RA.empty()), RA.empty())
      deepStrictEqual(RA.chunksOf(1)(empty), RA.empty())
      deepStrictEqual(RA.chunksOf(1)(RA.empty()), RA.empty())
      deepStrictEqual(RA.chunksOf(2)(empty), RA.empty())
      deepStrictEqual(RA.chunksOf(2)(RA.empty()), RA.empty())
    })

    it("should respect the law: chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))", () => {
      const xs: ReadonlyArray<number> = []
      const ys: ReadonlyArray<number> = [1, 2]
      deepStrictEqual(
        RA.chunksOf(2)(xs).concat(RA.chunksOf(2)(ys)),
        RA.chunksOf(2)(xs.concat(ys))
      )
      fc.assert(
        fc.property(
          fc.array(fc.integer()).filter((xs) => xs.length % 2 === 0), // Ensures `xs.length` is even
          fc.array(fc.integer()),
          fc.integer({ min: 1, max: 1 }).map((x) => x * 2), // Generates `n` to be even so that it evenly divides `xs`
          (xs, ys, n) => {
            const as = RA.chunksOf(n)(xs).concat(RA.chunksOf(n)(ys))
            const bs = RA.chunksOf(n)(xs.concat(ys))
            deepStrictEqual(as, bs)
          }
        )
      )
    })
  })

  it("makeBy", () => {
    deepStrictEqual(RA.makeBy(5, (n) => n * 2), [0, 2, 4, 6, 8])
    deepStrictEqual(RA.makeBy(2.2, (n) => n * 2), [0, 2])
  })

  it("replicate", () => {
    deepStrictEqual(RA.replicate("a", 0), ["a"])
    deepStrictEqual(RA.replicate("a", -1), ["a"])
    deepStrictEqual(RA.replicate("a", 3), ["a", "a", "a"])
    deepStrictEqual(RA.replicate("a", 2.2), ["a", "a"])
  })

  it("range", () => {
    expect(RA.range(0, 0)).toEqual([0])
    expect(RA.range(0, 1)).toEqual([0, 1])
    expect(RA.range(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(RA.range(10, 15)).toEqual([10, 11, 12, 13, 14, 15])
    expect(RA.range(-1, 0)).toEqual([-1, 0])
    expect(RA.range(-5, -1)).toEqual([-5, -4, -3, -2, -1])
    // out of bound
    expect(RA.range(2, 1)).toEqual([2])
    expect(RA.range(-1, -2)).toEqual([-1])
  })

  it("unionWith", () => {
    const two: ReadonlyArray<number> = [1, 2]
    deepStrictEqual(pipe(two, RA.unionWith([3, 4], Number.Equivalence)), [1, 2, 3, 4])
    deepStrictEqual(pipe(two, RA.unionWith([2, 3], Number.Equivalence)), [1, 2, 3])
    deepStrictEqual(pipe(two, RA.unionWith([1, 2], Number.Equivalence)), [1, 2])
    deepStrictEqual(pipe(two, RA.unionWith(RA.empty(), Number.Equivalence)), two)
    deepStrictEqual(pipe(RA.empty(), RA.unionWith(two, Number.Equivalence)), two)
    deepStrictEqual(
      pipe(RA.empty(), RA.unionWith(RA.empty(), Number.Equivalence)),
      RA.empty()
    )
  })

  it("intersectionWith", () => {
    const intersectionWith = RA.intersectionWith(Number.Equivalence)
    deepStrictEqual(pipe([1, 2], intersectionWith([3, 4])), [])
    deepStrictEqual(pipe([1, 2], intersectionWith([2, 3])), [2])
    deepStrictEqual(pipe([1, 2], intersectionWith([1, 2])), [1, 2])
  })

  it("differenceWith", () => {
    const differenceWith = RA.differenceWith(Number.Equivalence)
    deepStrictEqual(pipe([1, 2], differenceWith([3, 4])), [1, 2])
    deepStrictEqual(pipe([1, 2], differenceWith([2, 3])), [1])
    deepStrictEqual(pipe([1, 2], differenceWith([1, 2])), [])
  })

  it("empty", () => {
    deepStrictEqual(RA.empty.length, 0)
  })

  it("every", () => {
    const isPositive: Predicate<number> = (n) => n > 0
    expect(RA.every([1, 2, 3], isPositive)).toEqual(true)
    expect(RA.every([1, 2, -3], isPositive)).toEqual(false)
  })

  it("some", () => {
    const isPositive: Predicate<number> = (n) => n > 0
    expect(RA.some([-1, -2, 3], isPositive)).toEqual(true)
    expect(RA.some([-1, -2, -3], isPositive)).toEqual(false)
  })

  it("length", () => {
    deepStrictEqual(RA.length(RA.empty()), 0)
    deepStrictEqual(RA.length([]), 0)
    deepStrictEqual(RA.length(["a"]), 1)
  })

  it("fromOption", () => {
    deepStrictEqual(RA.fromOption(O.some("hello")), ["hello"])
    deepStrictEqual(RA.fromOption(O.none()), [])
  })

  it("forEach", () => {
    const log: Array<string> = []
    RA.forEach(["a", "b", "c"], (a, i) => log.push(`${a}-${i}`))
    expect(log).toEqual(["a-0", "b-1", "c-2"])
  })

  it("sortWith", () => {
    type X = {
      a: string
      b: number
    }
    const arr: ReadonlyArray<X> = [{ a: "a", b: 2 }, { a: "b", b: 1 }]
    expect(RA.sortWith(arr, (x) => x.b, Order.number)).toEqual([{ a: "b", b: 1 }, { a: "a", b: 2 }])
  })

  it("Do notation", () => {
    const _do = RA.Do
    Util.deepStrictEqual(_do, RA.of({}))

    const doA = RA.bind(_do, "a", () => ["a"])
    Util.deepStrictEqual(doA, RA.of({ a: "a" }))

    const doAB = RA.bind(doA, "b", (x) => ["b", x.a + "b"])
    Util.deepStrictEqual(doAB, [
      { a: "a", b: "b" },
      { a: "a", b: "ab" }
    ])
    const doABC = RA.let(doAB, "c", (x) => [x.a, x.b, x.a + x.b])
    Util.deepStrictEqual(doABC, [
      { a: "a", b: "b", c: ["a", "b", "ab"] },
      { a: "a", b: "ab", c: ["a", "ab", "aab"] }
    ])

    const doABCD = RA.bind(doABC, "d", () => RA.empty())
    Util.deepStrictEqual(doABCD, [])
  })
})
