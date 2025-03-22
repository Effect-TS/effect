import { describe, it } from "@effect/vitest"
import { Equal, Hash, Option, pipe } from "effect"
import { assertFalse, assertNone, assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"
import * as IM from "../src/IndexMap.js"

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
    const map = IM.make([Option.some(1), 0], [Option.none(), 1])
    assertTrue(pipe(map, IM.has(Option.none())))
    assertTrue(pipe(map, IM.has(Option.some(1))))
    assertFalse(pipe(map, IM.has(Option.some(2))))
  })

  it("toString", () => {
    const map = IM.make([0, "a"])
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
    const map = IM.make([0, "a"])
    deepStrictEqual(map.toJSON(), { _id: "IndexMap", values: [[0, "a"]] })
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      const map = IM.make([0, "a"])
      deepStrictEqual(inspect(map), inspect({ _id: "IndexMap", values: [[0, "a"]] }))
    }
  })

  it("has", () => {
    const map = IM.make([key(0), value("a")])

    assertTrue(IM.has(key(0))(map))
    assertFalse(IM.has(key(1))(map))
  })

  it("get", () => {
    const map = IM.make([key(0), value("a")])

    const result1 = IM.get(key(0))(map)
    assertTrue(Option.isSome(result1))
    if (Option.isSome(result1)) {
      deepStrictEqual(result1.value, value("a"))
    }

    assertNone(IM.get(key(1))(map))
  })

  it("set", () => {
    const map = pipe(IM.empty<Key, Value>(), IM.set(key(0), value("a")))

    const result = IM.get(key(0))(map)
    assertTrue(Option.isSome(result))
    if (Option.isSome(result)) {
      deepStrictEqual(result.value, value("a"))
    }
  })

  it("mutation", () => {
    let map = IM.empty()

    assertFalse((map as any)._editable)
    map = IM.beginMutation(map)
    assertTrue((map as any)._editable)
    map = IM.endMutation(map)
    assertFalse((map as any)._editable)
  })

  it("mutate", () => {
    const map = IM.empty<number, string>()
    const result = pipe(
      map,
      IM.mutate((mutableMap) => {
        pipe(mutableMap, IM.set(0, "a"))
      })
    )

    const optResult = IM.get(0)(result)
    assertTrue(Option.isSome(optResult))
    if (Option.isSome(optResult)) {
      strictEqual(optResult.value, "a")
    }

    assertNone(IM.get(1)(result))
  })

  it("preserves insertion order", () => {
    const map = pipe(
      IM.empty<number, string>(),
      IM.set(3, "c"),
      IM.set(1, "a"),
      IM.set(2, "b")
    )

    const entries = Array.from(map)
    deepStrictEqual(entries, [[3, "c"], [1, "a"], [2, "b"]])
  })

  it("getIndex returns entry at position", () => {
    const map = pipe(
      IM.empty<number, string>(),
      IM.set(3, "c"),
      IM.set(1, "a"),
      IM.set(2, "b")
    )

    const result0 = IM.getIndex(0)(map)
    const result1 = IM.getIndex(1)(map)
    const result2 = IM.getIndex(2)(map)

    assertTrue(Option.isSome(result0))
    if (Option.isSome(result0)) {
      deepStrictEqual(result0.value, [3, "c"])
    }

    assertTrue(Option.isSome(result1))
    if (Option.isSome(result1)) {
      deepStrictEqual(result1.value, [1, "a"])
    }

    assertTrue(Option.isSome(result2))
    if (Option.isSome(result2)) {
      deepStrictEqual(result2.value, [2, "b"])
    }

    assertNone(IM.getIndex(3)(map))
    assertNone(IM.getIndex(-1)(map))
  })

  it("pop removes last entry", () => {
    const map = pipe(
      IM.empty<number, string>(),
      IM.set(3, "c"),
      IM.set(1, "a"),
      IM.set(2, "b")
    )

    const result = IM.pop(map)
    assertTrue(Option.isSome(result))

    if (Option.isSome(result)) {
      const [[key, value], newMap] = result.value
      strictEqual(key, 2)
      strictEqual(value, "b")
      strictEqual(IM.size(newMap), 2)
      deepStrictEqual(Array.from(newMap), [[3, "c"], [1, "a"]])
    }
  })

  it("pop on empty map returns None", () => {
    const map = IM.empty<number, string>()
    assertNone(IM.pop(map))
  })

  it("filter", () => {
    const map1 = IM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, IM.filter((v: Value) => v.s.length > 1))

    assertNone(IM.get(key(0))(result1))

    const getResult = IM.get(key(1))(result1)
    assertTrue(Option.isSome(getResult))
    if (Option.isSome(getResult)) {
      deepStrictEqual(getResult.value, value("bb"))
    }

    const map2 = IM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, IM.filter((v: Value, k: Key) => k.n > 0 && v.s.length > 0))

    assertNone(IM.get(key(0))(result2))

    const getResult2 = IM.get(key(1))(result2)
    assertTrue(Option.isSome(getResult2))
    if (Option.isSome(getResult2)) {
      deepStrictEqual(getResult2.value, value("bb"))
    }
  })

  it("forEach", () => {
    const map1 = IM.make([key(0), value("a")], [key(1), value("b")])
    const result1: Array<string> = []
    pipe(
      map1,
      IM.forEach((v: Value) => {
        result1.push(v.s)
      })
    )

    deepStrictEqual(result1, ["a", "b"])

    const map2 = IM.make([key(0), value("a")], [key(1), value("b")])
    const result2: Array<readonly [number, string]> = []
    pipe(
      map2,
      IM.forEach((v: Value, k: Key) => {
        result2.push([k.n, v.s])
      })
    )

    deepStrictEqual(result2, [[0, "a"], [1, "b"]])
  })

  it("isEmpty", () => {
    assertTrue(IM.isEmpty(IM.make()))
    assertFalse(IM.isEmpty(IM.make([key(0), value("a")])))
  })

  it("map", () => {
    const map1 = IM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, IM.map((v: Value) => v.s.length))

    const getResult1a = IM.get(key(0))(result1)
    assertTrue(Option.isSome(getResult1a))
    if (Option.isSome(getResult1a)) {
      strictEqual(getResult1a.value, 1)
    }

    const getResult1b = IM.get(key(1))(result1)
    assertTrue(Option.isSome(getResult1b))
    if (Option.isSome(getResult1b)) {
      strictEqual(getResult1b.value, 2)
    }

    assertNone(IM.get(key(2))(result1))

    const map2 = IM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, IM.map((v: Value, k: Key) => k.n + v.s.length))

    const getResult2a = IM.get(key(0))(result2)
    assertTrue(Option.isSome(getResult2a))
    if (Option.isSome(getResult2a)) {
      strictEqual(getResult2a.value, 1)
    }

    const getResult2b = IM.get(key(1))(result2)
    assertTrue(Option.isSome(getResult2b))
    if (Option.isSome(getResult2b)) {
      strictEqual(getResult2b.value, 3)
    }

    assertNone(IM.get(key(2))(result2))
  })

  it("reduce", () => {
    const map1 = IM.make([key(0), value("a")], [key(1), value("b")])
    const result1 = pipe(map1, IM.reduce("", (acc, v: Value) => acc.length > 0 ? `${acc},${v.s}` : v.s))

    strictEqual(result1, "a,b")

    const map2 = IM.make([key(0), value("a")], [key(1), value("b")])
    const result2 = pipe(
      map2,
      IM.reduce(
        "",
        (acc, v: Value, k: Key) => acc.length > 0 ? `${acc},${k.n}:${v.s}` : `${k.n}:${v.s}`
      )
    )

    strictEqual(result2, "0:a,1:b")
  })

  it("remove", () => {
    const map = IM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, IM.remove(key(0)))

    assertNone(IM.get(key(0))(result))

    const getResult = IM.get(key(1))(result)
    assertTrue(Option.isSome(getResult))
    if (Option.isSome(getResult)) {
      deepStrictEqual(getResult.value, value("b"))
    }
  })

  it("remove maintains insertion order for remaining elements", () => {
    const map = pipe(
      IM.empty<number, string>(),
      IM.set(3, "c"),
      IM.set(1, "a"),
      IM.set(2, "b"),
      IM.set(4, "d")
    )

    // Remove middle element
    const result = pipe(map, IM.remove(1))

    // Check order is preserved
    deepStrictEqual(Array.from(result), [[3, "c"], [2, "b"], [4, "d"]])
  })

  it("size", () => {
    const map = IM.make([key(0), value("a")], [key(1), value("b")])
    const result = IM.size(map)

    strictEqual(result, 2)
  })

  it("keys", () => {
    const map = IM.make([0, "a"], [1, "b"])
    const result = Array.from(IM.keys(map))

    deepStrictEqual(result, [0, 1])
  })

  it("values", () => {
    const map = IM.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(IM.values(map))

    deepStrictEqual(result, [value("a"), value("b")])
  })

  it("entries", () => {
    const map = IM.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(IM.entries(map))

    deepStrictEqual(result, [[key(0), value("a")], [key(1), value("b")]])
  })

  it("pipe()", () => {
    strictEqual(
      IM.empty<string, string>().pipe(IM.set("key", "value")).pipe(IM.size),
      IM.make(["key", "value"]).pipe(IM.size)
    )
  })

  it("isIndexMap", () => {
    assertTrue(IM.isIndexMap(IM.empty()))
    assertFalse(IM.isIndexMap(null))
    assertFalse(IM.isIndexMap({}))
  })

  it("findFirst", () => {
    const map1 = IM.make([key(0), value("a")], [key(1), value("bb")])

    const result1 = IM.findFirst(map1, (_v: Value, k: Key) => k.n === 0)
    assertTrue(Option.isSome(result1))
    if (Option.isSome(result1)) {
      deepStrictEqual(result1.value, [key(0), value("a")])
    }

    const result2 = IM.findFirst(map1, (v: Value, _k: Key) => v.s === "bb")
    assertTrue(Option.isSome(result2))
    if (Option.isSome(result2)) {
      deepStrictEqual(result2.value, [key(1), value("bb")])
    }

    assertNone(IM.findFirst(map1, (v: Value, k: Key) => k.n === 0 && v.s === "bb"))
  })

  it("handles updates to existing keys", () => {
    const map = pipe(
      IM.empty<number, string>(),
      IM.set(1, "a"),
      IM.set(2, "b"),
      IM.set(3, "c")
    )

    // Update existing key
    const result = pipe(map, IM.set(2, "updated"))

    // Check value is updated
    const getResult = IM.get(2)(result)
    assertTrue(Option.isSome(getResult))
    if (Option.isSome(getResult)) {
      strictEqual(getResult.value, "updated")
    }

    // Check order is preserved
    deepStrictEqual(Array.from(result), [[1, "a"], [2, "updated"], [3, "c"]])
  })

  it("unsafeGet returns value or throws", () => {
    const map = IM.make([key(0), value("a")])

    strictEqual(IM.unsafeGet(key(0))(map).s, "a")

    // Should throw for non-existent key
    throws(() => IM.unsafeGet(key(1))(map))
  })

  it("equality compares both values and order", () => {
    const map1 = pipe(
      IM.empty<number, string>(),
      IM.set(1, "a"),
      IM.set(2, "b")
    )

    const map2 = pipe(
      IM.empty<number, string>(),
      IM.set(1, "a"),
      IM.set(2, "b")
    )

    const map3 = pipe(
      IM.empty<number, string>(),
      IM.set(2, "b"),
      IM.set(1, "a")
    )

    const map4 = pipe(
      IM.empty<number, string>(),
      IM.set(1, "a"),
      IM.set(2, "c")
    )

    // Same keys, values, and order
    assertTrue(Equal.equals(map1, map2))

    // Same keys and values, different order
    assertFalse(Equal.equals(map1, map3))

    // Same keys and order, different values
    assertFalse(Equal.equals(map1, map4))
  })
})
