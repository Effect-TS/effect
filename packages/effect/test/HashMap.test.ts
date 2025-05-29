import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Equal, Hash, HashMap as HM, Option, pipe } from "effect"

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

describe("HashMap", () => {
  function key(n: number): Key {
    return new Key(n)
  }

  function value(s: string): Value {
    return new Value(s)
  }

  it("option", () => {
    const map = HM.make([Option.some(1), 0], [Option.none(), 1])
    assertTrue(pipe(map, HM.has(Option.none())))
    assertTrue(pipe(map, HM.has(Option.some(1))))
    assertFalse(pipe(map, HM.has(Option.some(2))))
  })

  it("toString", () => {
    const map = HM.make([0, "a"])
    strictEqual(
      String(map),
      `{
  "_id": "HashMap",
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
    const map = HM.make([0, "a"])
    deepStrictEqual(map.toJSON(), { _id: "HashMap", values: [[0, "a"]] })
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { inspect } = require("node:util")
      const map = HM.make([0, "a"])
      deepStrictEqual(inspect(map), inspect({ _id: "HashMap", values: [[0, "a"]] }))
    }
  })

  it("has", () => {
    const map = HM.make([key(0), value("a")])

    assertTrue(HM.has(key(0))(map))
    assertFalse(HM.has(key(1))(map))
  })

  it("hasHash", () => {
    const map = HM.make([key(0), value("a")])

    assertTrue(HM.hasHash(key(0), Hash.hash(key(0)))(map))
    assertFalse(HM.hasHash(key(1), Hash.hash(key(0)))(map))
  })

  it("hasBy", () => {
    const map = HM.make([key(0), value("a")])

    assertTrue(HM.hasBy(map, (v) => Equal.equals(v, value("a"))))
    assertTrue(HM.hasBy(map, (_, k) => Equal.equals(k, key(0))))
    assertTrue(pipe(map, HM.hasBy((v) => Equal.equals(v, value("a")))))
    assertFalse(HM.hasBy(map, (v) => Equal.equals(v, value("b"))))
    assertFalse(HM.hasBy(map, (_, k) => Equal.equals(k, key(1))))
    assertFalse(pipe(map, HM.hasBy((v) => Equal.equals(v, value("b")))))
  })

  it("get", () => {
    const map = HM.make([key(0), value("a")])

    assertSome(HM.get(key(0))(map), value("a"))
    assertNone(HM.get(key(1))(map))
  })

  it("getHash", () => {
    const map = HM.make([key(0), value("a")])

    assertSome(HM.getHash(key(0), Hash.hash(0))(map), value("a"))
    assertNone(HM.getHash(key(1), Hash.hash(0))(map))
  })

  it("set", () => {
    const map = pipe(HM.empty<Key, Value>(), HM.set(key(0), value("a")))

    assertSome(HM.get(key(0))(map), value("a"))
  })

  it("mutation", () => {
    let map: any = HM.empty()

    assertFalse(map._editable)
    map = HM.beginMutation(map)
    assertTrue(map._editable)
    map = HM.endMutation(map)
    assertFalse(map._editable)
  })

  it("mutate", () => {
    const map = HM.empty<number, string>()
    const result = pipe(
      map,
      HM.mutate((map) => {
        pipe(map, HM.set(0, "a"))
      })
    )

    assertSome(HM.get(0)(result), "a")
    assertNone(HM.get(1)(result))
  })

  it("flatMap", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(
      map1,
      HM.flatMap(({ s }) => {
        const newKey = key(s.length)
        const newValue = value(s)
        return pipe(HM.empty<Key, Value>(), HM.set(newKey, newValue))
      })
    )

    assertSome(HM.get(key(1))(result1), value("a"))
    assertSome(HM.get(key(2))(result1), value("bb"))
    assertNone(HM.get(key(3))(result1))

    const map2 = HM.make([key(1), value("a")], [key(2), value("bb")])
    const result2 = pipe(
      map2,
      HM.flatMap(({ s }, { n }) => {
        const newKey = key(s.length + n)
        const newValue = value(s)
        return pipe(HM.empty<Key, Value>(), HM.set(newKey, newValue))
      })
    )

    assertSome(HM.get(key(2))(result2), value("a"))
    assertSome(HM.get(key(4))(result2), value("bb"))
    assertNone(HM.get(key(6))(result2))
  })

  it("filterMap", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(
      map1,
      HM.filterMap(({ s }) => s.length > 1 ? Option.some(value(s)) : Option.none())
    )

    assertNone(HM.get(key(0))(result1))
    assertSome(HM.get(key(1))(result1), value("bb"))

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(
      map2,
      HM.filterMap((v, { n }) => n > 0 ? Option.some(v) : Option.none())
    )

    assertNone(HM.get(key(0))(result2))
    assertSome(HM.get(key(1))(result2), value("bb"))
  })

  it("compact", () => {
    const map = HM.make([0, Option.some("a")], [1, Option.none()])
    const result = HM.compact(map)

    strictEqual(HM.unsafeGet(0)(result), "a")
    throws(() => HM.unsafeGet(1)(result))
  })

  it("filter", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, HM.filter(({ s }) => s.length > 1))

    assertNone(HM.get(key(0))(result1))
    assertSome(HM.get(key(1))(result1), value("bb"))

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, HM.filter(({ s }, { n }) => n > 0 && s.length > 0))

    assertNone(HM.get(key(0))(result2))
    assertSome(HM.get(key(1))(result2), value("bb"))
  })

  it("forEach", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result1: Array<string> = []
    pipe(
      map1,
      HM.forEach((v) => {
        result1.push(v.s)
      })
    )

    deepStrictEqual(result1, ["a", "b"])

    const map2 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result2: Array<readonly [number, string]> = []
    pipe(
      map2,
      HM.forEach(({ s }, { n }) => {
        result2.push([n, s])
      })
    )

    deepStrictEqual(result2, [[0, "a"], [1, "b"]])
  })

  it("isEmpty", () => {
    assertTrue(HM.isEmpty(HM.make()))
    assertFalse(HM.isEmpty(HM.make([key(0), value("a")])))
  })

  it("map", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, HM.map(({ s }) => s.length))

    assertSome(HM.get(key(0))(result1), 1)
    assertSome(HM.get(key(1))(result1), 2)
    assertNone(HM.get(key(2))(result1))

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, HM.map(({ s }, { n }) => n + s.length))

    assertSome(HM.get(key(0))(result2), 1)
    assertSome(HM.get(key(1))(result2), 3)
    assertNone(HM.get(key(2))(result2))
  })

  it("modifyAt", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(
      map,
      HM.modifyAt(key(0), (maybe) =>
        Option.isSome(maybe) ?
          Option.some(value("test")) :
          Option.none())
    )

    assertSome(HM.get(key(0))(result), value("test"))
    assertSome(HM.get(key(1))(result), value("b"))
    assertNone(HM.get(key(2))(result))

    assertNone(
      HM.get(key(0))(pipe(
        map,
        HM.modifyAt(key(0), (): Option.Option<Value> => Option.none())
      ))
    )
  })

  it("modifyHash", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(
      map,
      HM.modifyHash(key(0), Hash.hash(key(0)), (maybe) =>
        Option.isSome(maybe) ?
          Option.some(value("test")) :
          Option.none())
    )

    assertSome(HM.get(key(0))(result), value("test"))
    assertSome(HM.get(key(1))(result), value("b"))
    assertNone(HM.get(key(2))(result))
  })

  it("some", () => {
    const mapWith3LettersMax = HM.make([0, "a"], [1, "bb"], [3, "ccc"])

    deepStrictEqual(HM.some(mapWith3LettersMax, (value) => value.length > 3), false)
    deepStrictEqual(pipe(mapWith3LettersMax, HM.some((value) => value.length > 3)), false)

    deepStrictEqual(HM.some(mapWith3LettersMax, (value) => value.length > 1), true)

    deepStrictEqual(HM.some(mapWith3LettersMax, (value, key) => value.length > 1 && key === 0), false)

    deepStrictEqual(HM.some(mapWith3LettersMax, (value, key) => value.length > 1 && key === 1), true)
  })

  it("every", () => {
    const mapWith3LettersMax = HM.make([0, "a"], [1, "bb"], [3, "ccc"])

    deepStrictEqual(HM.every(mapWith3LettersMax, (value) => value.length > 2), false)
    deepStrictEqual(pipe(mapWith3LettersMax, HM.every((value) => value.length > 2)), false)

    deepStrictEqual(HM.every(mapWith3LettersMax, (value) => value.length >= 1), true)

    deepStrictEqual(HM.every(mapWith3LettersMax, (value, key) => value.length >= 1 && key === 0), false)

    deepStrictEqual(HM.every(mapWith3LettersMax, (value, key) => value.length >= 1 && key >= 0), true)
  })

  it("reduce", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result1 = pipe(map1, HM.reduce("", (acc, { s }) => acc.length > 0 ? `${acc},${s}` : s))

    strictEqual(result1, "a,b")

    const map2 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result2 = pipe(
      map2,
      HM.reduce(
        "",
        (acc, { s }, { n }) => acc.length > 0 ? `${acc},${n}:${s}` : `${n}:${s}`
      )
    )

    strictEqual(result2, "0:a,1:b")
  })

  it("remove", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.remove(key(0)))

    assertNone(HM.get(key(0))(result))
    assertSome(HM.get(key(1))(result), value("b"))
  })

  it("remove non existing key doesn't change the array", () => {
    const map = HM.make([13, 95], [90, 4])
    const result = pipe(map, HM.remove(75))

    deepStrictEqual(Array.from(HM.keySet(map)), Array.from(HM.keySet(result)))
  })

  it("removeMany", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.removeMany([key(0), key(1)]))

    assertFalse(HM.isEmpty(map))
    assertTrue(HM.isEmpty(result))
  })

  it("size", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = HM.size(map)

    strictEqual(result, 2)
  })

  it("union", () => {
    const map1 = HM.make([0, "a"], [1, "b"])
    const map2 = HM.make(["foo", true], ["bar", false])
    const result = HM.union(map2)(map1)

    assertSome(pipe(result, HM.get(0)), "a")
    assertSome(pipe(result, HM.get(1)), "b")
    assertSome(pipe(result, HM.get("foo")), true)
    assertSome(pipe(result, HM.get("bar")), false)
  })

  it("modify", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.modify(key(0), ({ s }) => value(`${s}-${s}`)))

    assertSome(HM.get(key(0))(result), value("a-a"))
    assertSome(HM.get(key(1))(result), value("b"))
    assertNone(HM.get(key(2))(result))

    assertNone(
      HM.get(key(2))(pipe(map, HM.modify(key(2), ({ s }) => value(`${s}-${s}`))))
    )
  })

  it("keys", () => {
    const map = HM.make([0, "a"], [1, "b"])
    const result = Array.from(HM.keys(map))

    deepStrictEqual(result, [0, 1])
  })

  it("keySet", () => {
    const hashMap = HM.make(
      [key(0), value("a")],
      [key(1), value("b")],
      [key(1), value("c")]
    )

    const result = HM.keySet(hashMap)

    deepStrictEqual([...result], [key(0), key(1)])
  })

  it("values", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(HM.values(map))

    deepStrictEqual(result, [value("a"), value("b")])
  })

  it("toValues", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = HM.toValues(map)

    deepStrictEqual(result, [value("a"), value("b")])
  })

  it("entries", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(HM.entries(map))

    deepStrictEqual(result, [[key(0), value("a")], [key(1), value("b")]])
  })

  it("toEntries", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = HM.toEntries(map)

    deepStrictEqual(result, [[key(0), value("a")], [key(1), value("b")]])
  })

  it("pipe()", () => {
    strictEqual(HM.empty().pipe(HM.set("key", "value")).pipe(HM.size), HM.make(["key", "value"]).pipe(HM.size))
  })

  it("isHashMap", () => {
    assertTrue(HM.isHashMap(HM.empty()))
    assertFalse(HM.isHashMap(null))
    assertFalse(HM.isHashMap({}))
  })

  it("findFirst", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("bb")])
    assertSome(HM.findFirst(map, (_v, k) => k.n === 0), [key(0), value("a")])
    assertSome(HM.findFirst(map, (v, _k) => v.s === "bb"), [key(1), value("bb")])
    assertNone(HM.findFirst(map, (v, k) => k.n === 0 && v.s === "bb"))
  })

  it("countBy", () => {
    const map = HM.make([key(1), value("a")], [key(2), value("b")], [key(3), value("c")])
    strictEqual(HM.countBy(map, (_v, k) => k.n % 2 === 1), 2)
    strictEqual(HM.countBy(map, (v, k) => k.n % 2 === 1 && v.s === "a"), 1)
    strictEqual(HM.countBy(map, (v, k) => k.n % 2 === 1 && v.s === "b"), 0)

    strictEqual(pipe(map, HM.countBy((_v, k) => k.n % 2 === 1)), 2)
    strictEqual(pipe(map, HM.countBy((v, k) => k.n % 2 === 1 && v.s === "a")), 1)
    strictEqual(pipe(map, HM.countBy((v, k) => k.n % 2 === 1 && v.s === "b")), 0)
  })
})
