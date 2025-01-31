import { describe, it } from "@effect/vitest"
import { Iterable as Iter, Number, Option, pipe } from "effect"
import type { Predicate } from "effect/Predicate"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"

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
    deepStrictEqual(Array.from(Iter.of(1)), [1])
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
      deepStrictEqual(pipe([1, 2, 3, 4], Iter.take(2), toArray), [1, 2])
      deepStrictEqual(pipe([1, 2, 3, 4], Iter.take(0), toArray), [])
      // out of bounds
      deepStrictEqual(pipe([1, 2, 3, 4], Iter.take(-10), toArray), [])
      deepStrictEqual(pipe([1, 2, 3, 4], Iter.take(10), toArray), [1, 2, 3, 4])

      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.take(2), toArray), [1, 2])
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.take(0), toArray), [])
      // out of bounds
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.take(-10), toArray), [])
      deepStrictEqual(pipe(new Set([1, 2, 3, 4]), Iter.take(10), toArray), [1, 2, 3, 4])
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
        assertNone(pipe([], Iter.findFirst((n) => n % 2 === 0)))
        assertSome(pipe([1, 2, 3], Iter.findFirst((n) => n % 2 === 0)), 2)
        assertSome(pipe([1, 2, 3, 4], Iter.findFirst((n) => n % 2 === 0)), 2)

        assertNone(pipe(new Set<number>(), Iter.findFirst((n) => n % 2 === 0)))
        assertSome(pipe(new Set([1, 2, 3]), Iter.findFirst((n) => n % 2 === 0)), 2)
        assertSome(pipe(new Set([1, 2, 3, 4]), Iter.findFirst((n) => n % 2 === 0)), 2)
      })

      it("Option-returning overloads", () => {
        assertNone(pipe([], Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())))
        assertSome(
          pipe([1, 2, 3], Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )
        assertSome(
          pipe([1, 2, 3, 4], Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )

        assertNone(
          pipe(new Set<number>(), Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none()))
        )
        assertSome(
          pipe(new Set([1, 2, 3]), Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )
        assertSome(
          pipe(new Set([1, 2, 3, 4]), Iter.findFirst((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )
      })
    })

    describe("findLast", () => {
      it("boolean-returning overloads", () => {
        assertNone(pipe([], Iter.findLast((n) => n % 2 === 0)))
        assertSome(pipe([1, 2, 3], Iter.findLast((n) => n % 2 === 0)), 2)
        assertSome(pipe([1, 2, 3, 4], Iter.findLast((n) => n % 2 === 0)), 4)

        assertNone(pipe(new Set<number>(), Iter.findLast((n) => n % 2 === 0)))
        assertSome(pipe(new Set([1, 2, 3]), Iter.findLast((n) => n % 2 === 0)), 2)
        assertSome(pipe(new Set([1, 2, 3, 4]), Iter.findLast((n) => n % 2 === 0)), 4)
      })

      it("Option-returning overloads", () => {
        assertNone(pipe([], Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())))
        assertSome(
          pipe([1, 2, 3], Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )
        assertSome(
          pipe([1, 2, 3, 4], Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [4, 3]
        )

        assertNone(
          pipe(new Set<number>(), Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none()))
        )
        assertSome(
          pipe(new Set([1, 2, 3]), Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [2, 1]
        )
        assertSome(
          pipe(new Set([1, 2, 3, 4]), Iter.findLast((n, i) => n % 2 === 0 ? Option.some([n, i]) : Option.none())),
          [4, 3]
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
      assertTrue(pipe([1, 2, 3], contains(2)))
      assertFalse(pipe([1, 2, 3], contains(0)))

      assertTrue(pipe(new Set([1, 2, 3]), contains(2)))
      assertFalse(pipe(new Set([1, 2, 3]), contains(0)))
    })

    it("contains", () => {
      const contains = Iter.contains
      assertTrue(pipe([1, 2, 3], contains(2)))
      assertFalse(pipe([1, 2, 3], contains(0)))

      assertTrue(pipe(new Set([1, 2, 3]), contains(2)))
      assertFalse(pipe(new Set([1, 2, 3]), contains(0)))
    })

    it("dedupeAdjacentWith", () => {
      const dedupeAdjacent = Iter.dedupeAdjacentWith(Number.Equivalence)
      deepStrictEqual(toArray(dedupeAdjacent([])), [])
      deepStrictEqual(toArray(dedupeAdjacent([1, 2, 3])), [1, 2, 3])
      deepStrictEqual(toArray(dedupeAdjacent([1, 2, 2, 3, 3])), [1, 2, 3])
    })
  })

  it("flatMapNullable", () => {
    const f = Iter.flatMapNullable((n: number) => (n > 0 ? n : null))
    deepStrictEqual(pipe([], f, toArray), [])
    deepStrictEqual(pipe([1], f, toArray), [1])
    deepStrictEqual(pipe([-1], f, toArray), [])
  })

  it("unfold", () => {
    const as = Iter.unfold(5, (n) => (n > 0 ? Option.some([n, n - 1]) : Option.none()))
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
    deepStrictEqual(toArray(Iter.getSomes([])), [])
    deepStrictEqual(toArray(Iter.getSomes([Option.some(1), Option.some(2), Option.some(3)])), [
      1,
      2,
      3
    ])
    deepStrictEqual(toArray(Iter.getSomes([Option.some(1), Option.none(), Option.some(3)])), [
      1,
      3
    ])
  })

  it("filter", () => {
    deepStrictEqual(toArray(Iter.filter([1, 2, 3], (n) => n % 2 === 1)), [1, 3])
    deepStrictEqual(toArray(Iter.filter([Option.some(3), Option.some(2), Option.some(1)], Option.isSome)), [
      Option.some(3),
      Option.some(2),
      Option.some(1)
    ])
    deepStrictEqual(toArray(Iter.filter([Option.some(3), Option.none(), Option.some(1)], Option.isSome)), [
      Option.some(3),
      Option.some(1)
    ])
    deepStrictEqual(toArray(Iter.filter(["a", "b", "c"], (_, i) => i % 2 === 0)), ["a", "c"])
  })

  it("filterMap", () => {
    const f = (n: number) => (n % 2 === 0 ? Option.none() : Option.some(n))
    deepStrictEqual(pipe([1, 2, 3], Iter.filterMap(f), toArray), [1, 3])
    deepStrictEqual(pipe([], Iter.filterMap(f), toArray), [])
    const g = (n: number, i: number) => ((i + n) % 2 === 0 ? Option.none() : Option.some(n))
    deepStrictEqual(pipe([1, 2, 4], Iter.filterMap(g), toArray), [1, 2])
    deepStrictEqual(pipe([], Iter.filterMap(g), toArray), [])
  })

  it("isEmpty", () => {
    assertFalse(Iter.isEmpty([1, 2, 3]))
    assertTrue(Iter.isEmpty([]))
  })

  it("head", () => {
    const as: ReadonlyArray<number> = [1, 2, 3]
    assertSome(Iter.head(as), 1)
    assertNone(Iter.head([]))
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
    deepStrictEqual(toArray(Iter.flatten([[1], [2], [3]])), [1, 2, 3])
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
    deepStrictEqual(Iter.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC), {
      [symA]: ["a"],
      [symB]: ["b"]
    })
    deepStrictEqual(Iter.groupBy(["a", "b", "c", "d"], (s) => s === "a" ? symA : s === "b" ? symB : symC), {
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
    deepStrictEqual(toArray(Iter.range(0, 0)), [0])
    deepStrictEqual(toArray(Iter.range(0, 1)), [0, 1])
    deepStrictEqual(toArray(Iter.range(1, 5)), [1, 2, 3, 4, 5])
    deepStrictEqual(toArray(Iter.range(10, 15)), [10, 11, 12, 13, 14, 15])
    deepStrictEqual(toArray(Iter.range(-1, 0)), [-1, 0])
    deepStrictEqual(toArray(Iter.range(-5, -1)), [-5, -4, -3, -2, -1])
    // out of bound
    deepStrictEqual(Array.from(Iter.range(2, 1)), [2])
    deepStrictEqual(Array.from(Iter.range(-1, -2)), [-1])
  })

  it("empty", () => {
    deepStrictEqual(toArray(Iter.empty()).length, 0)
  })

  it("some", () => {
    const isPositive: Predicate<number> = (n) => n > 0
    assertTrue(Iter.some([-1, -2, 3], isPositive))
    assertFalse(Iter.some([-1, -2, -3], isPositive))
  })

  it("size", () => {
    strictEqual(Iter.size(Iter.empty()), 0)
    strictEqual(Iter.size([]), 0)
    strictEqual(Iter.size(["a"]), 1)
  })

  it("forEach", () => {
    const log: Array<string> = []
    Iter.forEach(["a", "b", "c"], (a, i) => log.push(`${a}-${i}`))
    deepStrictEqual(log, ["a-0", "b-1", "c-2"])
  })
})
