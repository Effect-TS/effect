import { pipe } from "effect/Function"
import * as Iter from "effect/Iterable"
import * as Number from "effect/Number"
import * as O from "effect/Option"
import type { Predicate } from "effect/Predicate"
import { deepStrictEqual, strictEqual } from "effect/test/util"
import { assert, describe, expect, it } from "vitest"

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

const toArray = <A>(i: Iterable<A>) => {
  if (Array.isArray(i)) {
    throw new Error("not an iterable")
  }
  return Array.from(i)
}

describe("Iterable", () => {
  it("of", () => {
    expect(Array.from(Iter.of(1))).toEqual([1])
  })

  describe("iterable inputs", () => {
    it("prepend", () => {
      deepStrictEqual(pipe([1, 2, 3], Iter.prepend(0), toArray), [0, 1, 2, 3])
      deepStrictEqual(pipe([[2]], Iter.prepend([1]), toArray), [[1], [2]])

      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.prepend(0), toArray), [0, 1, 2, 3])
      deepStrictEqual(pipe(new Set([[2]]), Iter.prepend([1]), toArray), [[1], [2]])
    })

    it("prependAll", () => {
      deepStrictEqual(pipe([3, 4], Iter.prependAll([1, 2]), toArray), [1, 2, 3, 4])

      deepStrictEqual(pipe([3, 4], Iter.prependAll(new Set([1, 2])), toArray), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([3, 4]), Iter.prependAll([1, 2]), toArray), [1, 2, 3, 4])
    })

    it("append", () => {
      deepStrictEqual(pipe([1, 2, 3], Iter.append(4), toArray), [1, 2, 3, 4])
      deepStrictEqual(pipe([[1]], Iter.append([2]), toArray), [[1], [2]])

      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.append(4), toArray), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([[1]]), Iter.append([2]), toArray), [[1], [2]])
    })

    it("appendAll", () => {
      deepStrictEqual(pipe([1, 2], Iter.appendAll([3, 4]), toArray), [1, 2, 3, 4])

      deepStrictEqual(pipe([1, 2], Iter.appendAll(new Set([3, 4])), toArray), [1, 2, 3, 4])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.appendAll([3, 4]), toArray), [1, 2, 3, 4])
    })

    it("scan", () => {
      const f = (b: number, a: number) => b - a
      deepStrictEqual(pipe([1, 2, 3], Iter.scan(10, f), toArray), [10, 9, 7, 4])
      deepStrictEqual(pipe([0], Iter.scan(10, f), toArray), [10, 10])
      deepStrictEqual(pipe([], Iter.scan(10, f), toArray), [10])

      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.scan(10, f), toArray), [10, 9, 7, 4])
      deepStrictEqual(pipe(new Set([0]), Iter.scan(10, f), toArray), [10, 10])
      deepStrictEqual(pipe(new Set([]), Iter.scan(10, f), toArray), [10])
    })

    it("take", () => {
      expect(pipe([1, 2, 3, 4], Iter.take(2), toArray)).toEqual([1, 2])
      expect(pipe([1, 2, 3, 4], Iter.take(0), toArray)).toEqual([])
      // out of bounds
      expect(pipe([1, 2, 3, 4], Iter.take(-10), toArray)).toEqual([])
      expect(pipe([1, 2, 3, 4], Iter.take(10), toArray)).toEqual([1, 2, 3, 4])

      expect(pipe(new Set([1, 2, 3, 4]), Iter.take(2), toArray)).toEqual([1, 2])
      expect(pipe(new Set([1, 2, 3, 4]), Iter.take(0), toArray)).toEqual([])
      // out of bounds
      expect(pipe(new Set([1, 2, 3, 4]), Iter.take(-10), toArray)).toEqual([])
      expect(pipe(new Set([1, 2, 3, 4]), Iter.take(10), toArray)).toEqual([1, 2, 3, 4])
    })

    it("takeWhile", () => {
      const f = (n: number) => n % 2 === 0
      deepStrictEqual(pipe([2, 4, 3, 6], Iter.takeWhile(f), toArray), [2, 4])
      deepStrictEqual(pipe(Iter.empty(), Iter.takeWhile(f), toArray), [])
      deepStrictEqual(pipe([1, 2, 4], Iter.takeWhile(f), toArray), [])
      deepStrictEqual(pipe([2, 4], Iter.takeWhile(f), toArray), [2, 4])

      deepStrictEqual(pipe(new Set([2, 4, 3, 6]), Iter.takeWhile(f), toArray), [2, 4])
      deepStrictEqual(pipe(new Set<number>(), Iter.takeWhile(f), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2, 4]), Iter.takeWhile(f), toArray), [])
      deepStrictEqual(pipe(new Set([2, 4]), Iter.takeWhile(f), toArray), [2, 4])
    })

    it("drop", () => {
      deepStrictEqual(pipe(Iter.empty(), Iter.drop(0), toArray), [])
      deepStrictEqual(pipe([1, 2], Iter.drop(0), toArray), [1, 2])
      deepStrictEqual(pipe([1, 2], Iter.drop(1), toArray), [2])
      deepStrictEqual(pipe([1, 2], Iter.drop(2), toArray), [])
      // out of bound
      deepStrictEqual(pipe(Iter.empty(), Iter.drop(1), toArray), [])
      deepStrictEqual(pipe(Iter.empty(), Iter.drop(-1), toArray), [])
      deepStrictEqual(pipe([1, 2], Iter.drop(3), toArray), [])
      deepStrictEqual(pipe([1, 2], Iter.drop(-1), toArray), [1, 2])

      deepStrictEqual(pipe(new Set(), Iter.drop(0), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.drop(0), toArray), [1, 2])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.drop(1), toArray), [2])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.drop(2), toArray), [])
      // out of bound
      deepStrictEqual(pipe(new Set(), Iter.drop(1), toArray), [])
      deepStrictEqual(pipe(new Set(), Iter.drop(-1), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.drop(3), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.drop(-1), toArray), [1, 2])
    })

    describe("findFirst", () => {
      it("boolean-returning overloads", () => {
        deepStrictEqual(pipe([], Iter.findFirst((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe([1, 2, 3], Iter.findFirst((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe([1, 2, 3, 4], Iter.findFirst((n) => n % 2 === 0)), O.some(2))

        deepStrictEqual(pipe(new Set<number>(), Iter.findFirst((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.findFirst((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.findFirst((n) => n % 2 === 0)), O.some(2))
      })

      it("Option-returning overloads", () => {
        deepStrictEqual(pipe([], Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())), O.none())
        deepStrictEqual(
          pipe([1, 2, 3], Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe([1, 2, 3, 4], Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )

        deepStrictEqual(
          pipe(new Set<number>(), Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.none()
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3]), Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3, 4]), Iter.findFirst((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
      })
    })

    describe("findLast", () => {
      it("boolean-returning overloads", () => {
        deepStrictEqual(pipe([], Iter.findLast((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe([1, 2, 3], Iter.findLast((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe([1, 2, 3, 4], Iter.findLast((n) => n % 2 === 0)), O.some(4))

        deepStrictEqual(pipe(new Set<number>(), Iter.findLast((n) => n % 2 === 0)), O.none())
        deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.findLast((n) => n % 2 === 0)), O.some(2))
        deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.findLast((n) => n % 2 === 0)), O.some(4))
      })

      it("Option-returning overloads", () => {
        deepStrictEqual(pipe([], Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())), O.none())
        deepStrictEqual(
          pipe([1, 2, 3], Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe([1, 2, 3, 4], Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([4, 3])
        )

        deepStrictEqual(
          pipe(new Set<number>(), Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.none()
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3]), Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([2, 1])
        )
        deepStrictEqual(
          pipe(new Set([1, 2, 3, 4]), Iter.findLast((n, i) => n % 2 === 0 ? O.some([n, i]) : O.none())),
          O.some([4, 3])
        )
      })
    })

    it("zip", () => {
      deepStrictEqual(pipe(new Set([]), Iter.zip(new Set(["a", "b", "c", "d"])), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.zip(new Set([])), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.zip(new Set(["a", "b", "c", "d"])), toArray), [
        [1, "a"],
        [2, "b"],
        [3, "c"]
      ])
      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.zip(new Set(["a", "b", "c", "d"])), toArray), [
        [1, "a"],
        [2, "b"],
        [3, "c"]
      ])
    })

    it("zipWith", () => {
      deepStrictEqual(
        pipe(new Set([1, 2, 3]), Iter.zipWith(new Set([]), (n, s) => s + n), toArray),
        []
      )
      deepStrictEqual(
        pipe(new Set([]), Iter.zipWith(new Set(["a", "b", "c", "d"]), (n, s) => s + n), toArray),
        []
      )
      deepStrictEqual(
        pipe(new Set([]), Iter.zipWith(new Set([]), (n, s) => s + n), toArray),
        []
      )
      deepStrictEqual(
        pipe(new Set([1, 2, 3]), Iter.zipWith(new Set(["a", "b", "c", "d"]), (n, s) => s + n), toArray),
        ["a1", "b2", "c3"]
      )
    })

    it("intersperse", () => {
      deepStrictEqual(pipe([], Iter.intersperse(0), toArray), [])
      deepStrictEqual(pipe([1], Iter.intersperse(0), toArray), [1])
      deepStrictEqual(pipe([1, 2, 3], Iter.intersperse(0), toArray), [1, 0, 2, 0, 3])
      deepStrictEqual(pipe([1, 2], Iter.intersperse(0), toArray), [1, 0, 2])
      deepStrictEqual(pipe([1, 2, 3, 4], Iter.intersperse(0), toArray), [1, 0, 2, 0, 3, 0, 4])

      deepStrictEqual(pipe(new Set([]), Iter.intersperse(0), toArray), [])
      deepStrictEqual(pipe(new Set([1]), Iter.intersperse(0), toArray), [1])
      deepStrictEqual(pipe(new Set([1, 2, 3]), Iter.intersperse(0), toArray), [1, 0, 2, 0, 3])
      deepStrictEqual(pipe(new Set([1, 2]), Iter.intersperse(0), toArray), [1, 0, 2])
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.intersperse(0), toArray), [1, 0, 2, 0, 3, 0, 4])
    })

    it("containsWith", () => {
      const contains = Iter.containsWith(Number.Equivalence)
      deepStrictEqual(pipe([1, 2, 3], contains(2)), true)
      deepStrictEqual(pipe([1, 2, 3], contains(0)), false)

      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(2)), true)
      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(0)), false)
    })

    it("contains", () => {
      const contains = Iter.contains
      deepStrictEqual(pipe([1, 2, 3], contains(2)), true)
      deepStrictEqual(pipe([1, 2, 3], contains(0)), false)

      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(2)), true)
      deepStrictEqual(pipe(new Set([1, 2, 3]), contains(0)), false)
    })

    it("dedupeAdjacentWith", () => {
      const dedupeAdjacent = Iter.dedupeAdjacentWith(Number.Equivalence)
      expect(toArray(dedupeAdjacent([]))).toEqual([])
      expect(toArray(dedupeAdjacent([1, 2, 3]))).toEqual([1, 2, 3])
      expect(toArray(dedupeAdjacent([1, 2, 2, 3, 3]))).toEqual([1, 2, 3])
    })
  })

  it("flatMapNullable", () => {
    const f = Iter.flatMapNullable((n: number) => (n > 0 ? n : null))
    deepStrictEqual(pipe([], f, toArray), [])
    deepStrictEqual(pipe([1], f, toArray), [1])
    deepStrictEqual(pipe([-1], f, toArray), [])
  })

  it("unfold", () => {
    const as = Iter.unfold(5, (n) => (n > 0 ? O.some([n, n - 1]) : O.none()))
    deepStrictEqual(toArray(as), [5, 4, 3, 2, 1])
  })

  it("map", () => {
    deepStrictEqual(
      pipe([1, 2, 3], Iter.map((n) => n * 2), toArray),
      [2, 4, 6]
    )
    deepStrictEqual(
      pipe(["a", "b"], Iter.map((s, i) => s + i), toArray),
      ["a0", "b1"]
    )
  })

  it("flatMap", () => {
    deepStrictEqual(
      pipe([1, 2, 3], Iter.flatMap((n) => [n, n + 1]), toArray),
      [1, 2, 2, 3, 3, 4]
    )
    const f = (n: number, i: number) => [n + i]
    deepStrictEqual(pipe([], Iter.flatMap(f), toArray), [])
    deepStrictEqual(pipe([1, 2, 3], Iter.flatMap(f), toArray), [1, 3, 5])
  })

  it("getSomes", () => {
    assert.deepStrictEqual(toArray(Iter.getSomes([])), [])
    assert.deepStrictEqual(toArray(Iter.getSomes([O.some(1), O.some(2), O.some(3)])), [
      1,
      2,
      3
    ])
    assert.deepStrictEqual(toArray(Iter.getSomes([O.some(1), O.none(), O.some(3)])), [
      1,
      3
    ])
  })

  it("filter", () => {
    deepStrictEqual(toArray(Iter.filter([1, 2, 3], (n) => n % 2 === 1)), [1, 3])
    deepStrictEqual(toArray(Iter.filter([O.some(3), O.some(2), O.some(1)], O.isSome)), [
      O.some(3),
      O.some(2),
      O.some(1)
    ])
    deepStrictEqual(toArray(Iter.filter([O.some(3), O.none(), O.some(1)], O.isSome)), [O.some(3), O.some(1)])
    deepStrictEqual(toArray(Iter.filter(["a", "b", "c"], (_, i) => i % 2 === 0)), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? O.none() : O.some(n))
    deepStrictEqual(pipe([1, 2, 3], Iter.filterMap(f), toArray), [1, 3])
    deepStrictEqual(pipe([], Iter.filterMap(f), toArray), [])
    const g = (n: number, i: number) => ((i + n) % 2 === 0 ? O.none() : O.some(n))
    deepStrictEqual(pipe([1, 2, 4], Iter.filterMap(g), toArray), [1, 2])
    deepStrictEqual(pipe([], Iter.filterMap(g), toArray), [])
  })

  it("isEmpty", () => {
    deepStrictEqual(Iter.isEmpty([1, 2, 3]), false)
    deepStrictEqual(Iter.isEmpty([]), true)
  })

  it("head", () => {
    const as: ReadonlyArray<number> = [1, 2, 3]
    deepStrictEqual(Iter.head(as), O.some(1))
    deepStrictEqual(Iter.head([]), O.none())
  })

  it("chunksOf", () => {
    deepStrictEqual(toArray(Iter.chunksOf(2)([1, 2, 3, 4, 5])), [
      [1, 2],
      [3, 4],
      [5]
    ])
    deepStrictEqual(toArray(Iter.chunksOf(2)([1, 2, 3, 4, 5, 6])), [
      [1, 2],
      [3, 4],
      [5, 6]
    ])
    deepStrictEqual(toArray(Iter.chunksOf(1)([1, 2, 3, 4, 5])), [[1], [2], [3], [4], [5]])
    deepStrictEqual(toArray(Iter.chunksOf(5)([1, 2, 3, 4, 5])), [[1, 2, 3, 4, 5]])
    // out of bounds
    deepStrictEqual(toArray(Iter.chunksOf(0)([1, 2, 3, 4, 5])), [[1], [2], [3], [4], [5]])
    deepStrictEqual(toArray(Iter.chunksOf(-1)([1, 2, 3, 4, 5])), [[1], [2], [3], [4], [5]])

    const assertSingleChunk = (
      input: Iterable<number>,
      n: number
    ) => {
      const chunks = toArray(Iter.chunksOf(n)(input))
      strictEqual(chunks.length, 1)
      deepStrictEqual(chunks[0], input)
    }
    // n = length
    assertSingleChunk([1, 2], 2)
    // n out of bounds
    assertSingleChunk([1, 2], 3)
  })

  it("flatten", () => {
    expect(toArray(Iter.flatten([[1], [2], [3]]))).toEqual([1, 2, 3])
  })

  it("groupWith", () => {
    const groupWith = Iter.groupWith(Number.Equivalence)
    deepStrictEqual(toArray(groupWith([1, 2, 1, 1])), [[1], [2], [1, 1]])
    deepStrictEqual(toArray(groupWith([1, 2, 1, 1, 3])), [[1], [2], [1, 1], [3]])
  })

  it("groupBy", () => {
    deepStrictEqual(Iter.groupBy((_) => "")([]), {})
    deepStrictEqual(Iter.groupBy((a) => `${a}`)([1]), { "1": [1] })
    deepStrictEqual(
      Iter.groupBy((s: string) => `${s.length}`)(["foo", "bar", "foobar"]),
      {
        "3": ["foo", "bar"],
        "6": ["foobar"]
      }
    )
    expect(Iter.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC)).toStrictEqual({
      [symA]: ["a"],
      [symB]: ["b"]
    })
    expect(Iter.groupBy(["a", "b", "c", "d"], (s) => s === "a" ? symA : s === "b" ? symB : symC)).toStrictEqual({
      [symA]: ["a"],
      [symB]: ["b"],
      [symC]: ["c", "d"]
    })
  })

  it("makeBy", () => {
    deepStrictEqual(
      pipe(
        Iter.makeBy((n) => n * 2),
        Iter.take(5),
        toArray
      ),
      [0, 2, 4, 6, 8]
    )
    deepStrictEqual(toArray(Iter.makeBy((n) => n * 2, { length: 5 })), [0, 2, 4, 6, 8])
    deepStrictEqual(toArray(Iter.makeBy((n) => n * 2, { length: 2.2 })), [0, 2])
  })

  it("replicate", () => {
    deepStrictEqual(toArray(Iter.replicate("a", 0)), ["a"])
    deepStrictEqual(toArray(Iter.replicate("a", -1)), ["a"])
    deepStrictEqual(toArray(Iter.replicate("a", 3)), ["a", "a", "a"])
    deepStrictEqual(toArray(Iter.replicate("a", 2.2)), ["a", "a"])
  })

  it("range", () => {
    expect(toArray(Iter.range(0, 0))).toEqual([0])
    expect(toArray(Iter.range(0, 1))).toEqual([0, 1])
    expect(toArray(Iter.range(1, 5))).toEqual([1, 2, 3, 4, 5])
    expect(toArray(Iter.range(10, 15))).toEqual([10, 11, 12, 13, 14, 15])
    expect(toArray(Iter.range(-1, 0))).toEqual([-1, 0])
    expect(toArray(Iter.range(-5, -1))).toEqual([-5, -4, -3, -2, -1])
    // out of bound
    expect(Array.from(Iter.range(2, 1))).toEqual([2])
    expect(Array.from(Iter.range(-1, -2))).toEqual([-1])
  })

  it("empty", () => {
    deepStrictEqual(toArray(Iter.empty()).length, 0)
  })

  it("some", () => {
    const isPositive: Predicate<number> = (n) => n > 0
    expect(Iter.some([-1, -2, 3], isPositive)).toEqual(true)
    expect(Iter.some([-1, -2, -3], isPositive)).toEqual(false)
  })

  it("size", () => {
    deepStrictEqual(Iter.size(Iter.empty()), 0)
    deepStrictEqual(Iter.size([]), 0)
    deepStrictEqual(Iter.size(["a"]), 1)
  })

  it("forEach", () => {
    const log: Array<string> = []
    Iter.forEach(["a", "b", "c"], (a, i) => log.push(`${a}-${i}`))
    expect(log).toEqual(["a-0", "b-1", "c-2"])
  })
})
