import { describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Equal, Hash, Number as Num, pipe, SortedMap as SM } from "effect"

class Key implements Equal.Equal {
  constructor(readonly id: number) {}

  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }

  [Equal.symbol](u: unknown): boolean {
    return u instanceof Key && this.id === u.id
  }
}

class Value implements Equal.Equal {
  constructor(readonly id: number) {}

  [Hash.symbol](): number {
    return Hash.hash(this.id)
  }

  [Equal.symbol](u: unknown): boolean {
    return u instanceof Value && this.id === u.id
  }
}

function key(n: number): Key {
  return new Key(n)
}

function value(n: number): Value {
  return new Value(n)
}

function makeSortedMap(...numbers: Array<readonly [number, number]>): SM.SortedMap<Key, Value> {
  const entries = numbers.map(([k, v]) => [key(k), value(v)] as const)
  return SM.fromIterable(entries, (self: Key, that: Key) => self.id > that.id ? 1 : self.id < that.id ? -1 : 0)
}

function makeNumericSortedMap(
  ...numbers: Array<readonly [number, number]>
): SM.SortedMap<number, number> {
  return SM.fromIterable(numbers, (self: number, that: number) => self > that ? 1 : self < that ? -1 : 0)
}

describe("SortedMap", () => {
  it("toString", () => {
    const map = makeNumericSortedMap([0, 10], [1, 20], [2, 30])

    strictEqual(
      String(map),
      `{
  "_id": "SortedMap",
  "values": [
    [
      0,
      10
    ],
    [
      1,
      20
    ],
    [
      2,
      30
    ]
  ]
}`
    )
  })

  it("toJSON", () => {
    const map = makeNumericSortedMap([0, 10], [1, 20], [2, 30])

    deepStrictEqual(map.toJSON(), { _id: "SortedMap", values: [[0, 10], [1, 20], [2, 30]] })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")

    const map = makeNumericSortedMap([0, 10], [1, 20], [2, 30])

    deepStrictEqual(inspect(map), inspect({ _id: "SortedMap", values: [[0, 10], [1, 20], [2, 30]] }))
  })

  it("entries", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result = Array.from(map)

    deepStrictEqual([
      [key(0), value(10)],
      [key(1), value(20)],
      [key(2), value(30)]
    ], result)
  })

  it("get", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    assertSome(pipe(map, SM.get(key(0))), value(10))
    assertNone(pipe(map, SM.get(key(4))))
  })

  it("has", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    assertTrue(pipe(map, SM.has(key(0))))
    assertFalse(pipe(map, SM.has(key(4))))
  })

  it("headOption", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const map2 = SM.empty<number, number>(Num.Order)

    assertSome(SM.headOption(map1), [key(0), value(10)])
    assertNone(SM.headOption(map2))
  })

  it("lastOption", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const map2 = SM.empty<number, number>(Num.Order)

    assertSome(SM.lastOption(map1), [key(2), value(30)])
    assertNone(SM.lastOption(map2))
  })

  it("isEmpty", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const map2 = SM.empty<number, number>(Num.Order)

    assertFalse(SM.isEmpty(map1))
    assertTrue(SM.isEmpty(map2))
  })

  it("isNonEmpty", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const map2 = SM.empty<number, number>(Num.Order)

    assertTrue(SM.isNonEmpty(map1))
    assertFalse(SM.isNonEmpty(map2))
  })

  it("map", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result1 = Array.from(pipe(map1, SM.map((value) => value.id)))

    deepStrictEqual(
      result1,
      [
        [key(0), 10],
        [key(1), 20],
        [key(2), 30]
      ]
    )

    const map2 = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result2 = Array.from(pipe(map2, SM.map((key, value) => key.id + value.id)))

    deepStrictEqual(
      result2,
      [
        [key(0), 10],
        [key(1), 21],
        [key(2), 32]
      ]
    )
  })

  it("partition", () => {
    const map1 = makeSortedMap([1, 10], [2, 20], [3, 30], [4, 40], [5, 50])

    const [excl, satisfying] = pipe(
      map1,
      SM.partition((member) => member.id <= 3)
    )

    deepStrictEqual(
      Array.from(satisfying),
      [
        [key(1), value(10)],
        [key(2), value(20)],
        [key(3), value(30)]
      ]
    )
    deepStrictEqual(
      Array.from(excl),
      [
        [key(4), value(40)],
        [key(5), value(50)]
      ]
    )

    const [excl2, satisfying2] = pipe(
      map1,
      SM.partition((member) => member.id <= 6)
    )

    deepStrictEqual(
      Array.from(satisfying2),
      [
        [key(1), value(10)],
        [key(2), value(20)],
        [key(3), value(30)],
        [key(4), value(40)],
        [key(5), value(50)]
      ]
    )

    deepStrictEqual(
      Array.from(excl2),
      []
    )

    const [excl3, satisfying3] = pipe(
      map1,
      SM.partition((member) => member.id === 0)
    )

    deepStrictEqual(
      Array.from(excl3),
      [
        [key(1), value(10)],
        [key(2), value(20)],
        [key(3), value(30)],
        [key(4), value(40)],
        [key(5), value(50)]
      ]
    )

    deepStrictEqual(
      Array.from(satisfying3),
      []
    )
  })

  it("reduce", () => {
    const map1 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const result1 = pipe(map1, SM.reduce("", (acc, value) => acc + value.id))
    strictEqual(result1, "102030")

    const map2 = makeSortedMap([0, 10], [1, 20], [2, 30])
    const result2 = pipe(map2, SM.reduce("", (acc, value, key) => acc + key.id + value.id))
    strictEqual(result2, "010120230")
  })

  it("remove", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    assertTrue(pipe(map, SM.has(key(0))))

    const result1 = pipe(map, SM.remove(key(0)))

    assertFalse(pipe(result1, SM.has(key(0))))
  })

  it("set", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    assertFalse(pipe(map, SM.has(key(4))))

    const result1 = pipe(map, SM.set(key(4), value(40)))

    assertTrue(pipe(result1, SM.has(key(4))))
  })

  it("size", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    strictEqual(SM.size(map), 3)
  })

  it("keys", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result = Array.from(SM.keys(map))

    deepStrictEqual(result, [key(0), key(1), key(2)])
  })

  it("values", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result = Array.from(SM.values(map))

    deepStrictEqual(result, [value(10), value(20), value(30)])
  })

  it("entries", () => {
    const map = makeSortedMap([0, 10], [1, 20], [2, 30])

    const result = Array.from(SM.entries(map))

    deepStrictEqual(result, [[key(0), value(10)], [key(1), value(20)], [key(2), value(30)]])
  })
})
