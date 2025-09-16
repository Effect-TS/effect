import { describe, it } from "@effect/vitest"
import { Equal, Hash, IndexMap, Option, pipe } from "effect"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"

class Key implements Equal.Equal {
  constructor(readonly n: number) {}

  [Hash.symbol](): number {
    return Hash.hash(this.n)
  }

  [Equal.symbol](u: unknown): boolean {
    return u instanceof Key && this.n === u.n
  }
}

class Value implements Equal.Equal {
  constructor(readonly s: string) {}

  [Hash.symbol](): number {
    return Hash.hash(this.s)
  }

  [Equal.symbol](u: unknown): boolean {
    return u instanceof Value && this.s === u.s
  }
}

describe("IndexMap", () => {
  function key(n: number): Key {
    return new Key(n)
  }

  function value(s: string): Value {
    return new Value(s)
  }

  it("option", () => {
    const map = IndexMap.make([Option.some(1), 0], [Option.none(), 1])
    assertTrue(IndexMap.has(map, Option.none()))
    assertTrue(IndexMap.has(map, Option.some(1)))
    assertFalse(IndexMap.has(map, Option.some(2)))
  })

  it("toString", () => {
    const map = IndexMap.make([0, "a"])
    strictEqual(
      String(map),
      `{
  "_id": "IndexMap",
  "values": [
    [
      0,
      "a"
    ]
  ]
}`
    )
  })

  it("toJSON", () => {
    const map = IndexMap.make([0, "a"])
    deepStrictEqual(map.toJSON(), { _id: "IndexMap", values: [[0, "a"]] })
  })

  it("has", () => {
    const map = IndexMap.make([key(0), value("a")])
    assertTrue(IndexMap.has(key(0))(map))
    assertFalse(IndexMap.has(key(1))(map))
  })

  it("get", () => {
    const map = IndexMap.make([key(0), value("a")])
    const result1 = IndexMap.get(key(0))(map)
    assertSome(result1, value("a"))
    assertNone(IndexMap.get(key(1))(map))
  })

  it("set", () => {
    const map = pipe(
      IndexMap.empty<Key, Value>(),
      IndexMap.set(key(0), value("a"))
    )

    const result = IndexMap.get(key(0))(map)
    assertSome(result, value("a"))
  })

  it("mutation", () => {
    let map = IndexMap.empty()

    assertFalse((map as any)._editable)
    map = IndexMap.beginMutation(map)
    assertTrue((map as any)._editable)
    map = IndexMap.endMutation(map)
    assertFalse((map as any)._editable)
  })

  it("mutate", () => {
    const map = IndexMap.empty<number, string>()
    const result = IndexMap.mutate(map, (mutable) => {
      IndexMap.set(mutable, 0, "a")
    })

    const optResult = IndexMap.get(0)(result)
    assertSome(optResult, "a")
    assertNone(IndexMap.get(1)(result))
  })

  it("preserves insertion order", () => {
    const map = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(3, "c"),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b")
    )

    const entries = Array.from(map)
    deepStrictEqual(entries, [[3, "c"], [1, "a"], [2, "b"]])
  })

  it("getIndex returns entry at position", () => {
    const map = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(3, "c"),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b")
    )

    const result0 = IndexMap.getIndex(0)(map)
    const result1 = IndexMap.getIndex(1)(map)
    const result2 = IndexMap.getIndex(2)(map)

    assertSome(result0, [3, "c"])
    assertSome(result1, [1, "a"])
    assertSome(result2, [2, "b"])

    assertNone(IndexMap.getIndex(3)(map))
    assertNone(IndexMap.getIndex(-1)(map))
  })

  it("pop removes last entry", () => {
    const map = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(3, "c"),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b")
    )

    const result = IndexMap.pop(map)
    assertTrue(Option.isSome(result))

    if (Option.isSome(result)) {
      const [[key, value], newMap] = result.value
      strictEqual(key, 2)
      strictEqual(value, "b")
      strictEqual(IndexMap.size(newMap), 2)
      deepStrictEqual(Array.from(newMap), [[3, "c"], [1, "a"]])
    }
  })

  it("pop on empty map returns None", () => {
    const map = IndexMap.empty<number, string>()
    assertNone(IndexMap.pop(map))
  })

  it("filter", () => {
    const map1 = IndexMap.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, IndexMap.filter((v: Value) => v.s.length > 1))

    assertNone(IndexMap.get(key(0))(result1))

    const getResult = IndexMap.get(key(1))(result1)
    assertSome(getResult, value("bb"))

    const map2 = IndexMap.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, IndexMap.filter((v: Value, k: Key) => k.n > 0 && v.s.length > 0))

    assertNone(IndexMap.get(key(0))(result2))

    const getResult2 = IndexMap.get(key(1))(result2)
    assertSome(getResult2, value("bb"))
  })

  it("forEach", () => {
    const map1 = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result1: Array<string> = []
    IndexMap.forEach(map1, (v: Value) => {
      result1.push(v.s)
    })

    deepStrictEqual(result1, ["a", "b"])

    const map2 = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result2: Array<readonly [number, string]> = []
    IndexMap.forEach(map2, (v: Value, k: Key) => {
      result2.push([k.n, v.s])
    })

    deepStrictEqual(result2, [[0, "a"], [1, "b"]])
  })

  it("isEmpty", () => {
    assertTrue(IndexMap.isEmpty(IndexMap.make()))
    assertFalse(IndexMap.isEmpty(IndexMap.make([key(0), value("a")])))
  })

  it("map", () => {
    const map1 = IndexMap.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = IndexMap.map(map1, (v: Value) => v.s.length)

    const getResult1a = IndexMap.get(result1, key(0))
    assertSome(getResult1a, 1)

    const getResult1b = IndexMap.get(result1, key(1))
    assertSome(getResult1b, 2)

    assertNone(IndexMap.get(result1, key(2)))

    const map2 = IndexMap.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = IndexMap.map(map2, (v: Value, k: Key) => k.n + v.s.length)

    const getResult2a = IndexMap.get(result2, key(0))
    assertSome(getResult2a, 1)

    const getResult2b = IndexMap.get(result2, key(1))
    assertSome(getResult2b, 3)

    assertNone(IndexMap.get(result2, key(2)))
  })

  it("reduce", () => {
    const map1 = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result1 = IndexMap.reduce(map1, "", (acc, v: Value) => acc.length > 0 ? `${acc},${v.s}` : v.s)

    strictEqual(result1, "a,b")

    const map2 = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result2 = IndexMap.reduce(
      map2,
      "",
      (acc, v: Value, k: Key) => acc.length > 0 ? `${acc},${k.n}:${v.s}` : `${k.n}:${v.s}`
    )

    strictEqual(result2, "0:a,1:b")
  })

  it("remove", () => {
    const map = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result = IndexMap.remove(map, key(0))

    assertNone(IndexMap.get(result, key(0)))

    const getResult = IndexMap.get(result, key(1))
    assertSome(getResult, value("b"))
  })

  it("remove maintains insertion order for remaining elements", () => {
    const map = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(3, "c"),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b"),
      IndexMap.set(4, "d")
    )

    // Remove middle element
    const result = IndexMap.remove(map, 1)

    // Check order is preserved
    deepStrictEqual(Array.from(result), [[3, "c"], [2, "b"], [4, "d"]])
  })

  it("size", () => {
    const map = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result = IndexMap.size(map)

    strictEqual(result, 2)
  })

  it("keys", () => {
    const map = IndexMap.make([0, "a"], [1, "b"])
    const result = Array.from(IndexMap.keys(map))

    deepStrictEqual(result, [0, 1])
  })

  it("values", () => {
    const map = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(IndexMap.values(map))

    deepStrictEqual(result, [value("a"), value("b")])
  })

  it("entries", () => {
    const map = IndexMap.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(IndexMap.entries(map))

    deepStrictEqual(result, [[key(0), value("a")], [key(1), value("b")]])
  })

  it("pipe()", () => {
    strictEqual(
      IndexMap.empty<string, string>().pipe(IndexMap.set("key", "value")).pipe(IndexMap.size),
      IndexMap.make(["key", "value"]).pipe(IndexMap.size)
    )
  })

  it("isIndexMap", () => {
    assertTrue(IndexMap.isIndexMap(IndexMap.empty()))
    assertFalse(IndexMap.isIndexMap(null))
    assertFalse(IndexMap.isIndexMap({}))
  })

  it("findFirst", () => {
    const map1 = IndexMap.make([key(0), value("a")], [key(1), value("bb")])

    const result1 = IndexMap.findFirst(map1, (_v: Value, k: Key) => k.n === 0)
    assertSome(result1, [key(0), value("a")])

    const result2 = IndexMap.findFirst(map1, (v: Value, _k: Key) => v.s === "bb")
    assertSome(result2, [key(1), value("bb")])

    assertNone(IndexMap.findFirst(map1, (v: Value, k: Key) => k.n === 0 && v.s === "bb"))
  })

  it("handles updates to existing keys", () => {
    const map = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b"),
      IndexMap.set(3, "c")
    )

    // Update existing key
    const result = IndexMap.set(map, 2, "updated")

    // Check value is updated
    const getResult = IndexMap.get(result, 2)
    assertSome(getResult, "updated")

    // Check order is preserved
    deepStrictEqual(Array.from(result), [[1, "a"], [2, "updated"], [3, "c"]])
  })

  it("unsafeGet returns value or throws", () => {
    const map = IndexMap.make([key(0), value("a")])

    strictEqual(IndexMap.unsafeGet(map, key(0)).s, "a")

    // Should throw for non-existent key
    throws(() => IndexMap.unsafeGet(map, key(1)))
  })

  it("equality compares both values and order", () => {
    const map1 = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b")
    )

    const map2 = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "b")
    )

    const map3 = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(2, "b"),
      IndexMap.set(1, "a")
    )

    const map4 = pipe(
      IndexMap.empty<number, string>(),
      IndexMap.set(1, "a"),
      IndexMap.set(2, "c")
    )

    // Same keys, values, and order
    assertTrue(Equal.equals(map1, map2))

    // Same keys and values, different order
    assertFalse(Equal.equals(map1, map3))

    // Same keys and order, different values
    assertFalse(Equal.equals(map1, map4))
  })
})
