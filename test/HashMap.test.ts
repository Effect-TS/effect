import { deepStrictEqual } from "effect-test/util"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as HM from "effect/HashMap"
import * as Option from "effect/Option"
import { assert, describe, expect, it } from "vitest"

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
    expect(pipe(map, HM.has(Option.none()))).toBe(true)
    expect(pipe(map, HM.has(Option.some(1)))).toBe(true)
    expect(pipe(map, HM.has(Option.some(2)))).toBe(false)
  })

  it("toString", () => {
    const map = HM.make([0, "a"])
    expect(String(map)).toEqual(`{
  "_id": "HashMap",
  "values": [
    [
      0,
      "a"
    ]
  ]
}`)
  })

  it("toJSON", () => {
    const map = HM.make([0, "a"])
    expect(map.toJSON()).toEqual({ _id: "HashMap", values: [[0, "a"]] })
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      const map = HM.make([0, "a"])
      expect(inspect(map)).toEqual(inspect({ _id: "HashMap", values: [[0, "a"]] }))
    }
  })

  it("has", () => {
    const map = HM.make([key(0), value("a")])

    assert.isTrue(HM.has(key(0))(map))
    assert.isFalse(HM.has(key(1))(map))
  })

  it("hasHash", () => {
    const map = HM.make([key(0), value("a")])

    assert.isTrue(HM.hasHash(key(0), Hash.hash(key(0)))(map))
    assert.isFalse(HM.hasHash(key(1), Hash.hash(key(0)))(map))
  })

  it("get", () => {
    const map = HM.make([key(0), value("a")])

    deepStrictEqual(HM.get(key(0))(map), Option.some(value("a")))
    deepStrictEqual(HM.get(key(1))(map), Option.none())
  })

  it("getHash", () => {
    const map = HM.make([key(0), value("a")])

    deepStrictEqual(HM.getHash(key(0), Hash.hash(0))(map), Option.some(value("a")))
    deepStrictEqual(HM.getHash(key(1), Hash.hash(0))(map), Option.none())
  })

  it("set", () => {
    const map = pipe(HM.empty<Key, Value>(), HM.set(key(0), value("a")))

    deepStrictEqual(HM.get(key(0))(map), Option.some(value("a")))
  })

  it("mutation", () => {
    let map = HM.empty()
    assert.propertyVal(map, "_editable", false)
    map = HM.beginMutation(map)
    assert.propertyVal(map, "_editable", true)
    map = HM.endMutation(map)
    assert.propertyVal(map, "_editable", false)
  })

  it("mutate", () => {
    const map = HM.empty<number, string>()
    const result = pipe(
      map,
      HM.mutate((map) => {
        pipe(map, HM.set(0, "a"))
      })
    )

    deepStrictEqual(HM.get(0)(result), Option.some("a"))
    deepStrictEqual(HM.get(1)(result), Option.none())
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

    deepStrictEqual(HM.get(key(1))(result1), Option.some(value("a")))
    deepStrictEqual(HM.get(key(2))(result1), Option.some(value("bb")))
    deepStrictEqual(HM.get(key(3))(result1), Option.none())

    const map2 = HM.make([key(1), value("a")], [key(2), value("bb")])
    const result2 = pipe(
      map2,
      HM.flatMap(({ s }, { n }) => {
        const newKey = key(s.length + n)
        const newValue = value(s)
        return pipe(HM.empty<Key, Value>(), HM.set(newKey, newValue))
      })
    )

    deepStrictEqual(HM.get(key(2))(result2), Option.some(value("a")))
    deepStrictEqual(HM.get(key(4))(result2), Option.some(value("bb")))
    deepStrictEqual(HM.get(key(6))(result2), Option.none())
  })

  it("filterMap", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(
      map1,
      HM.filterMap(({ s }) => s.length > 1 ? Option.some(value(s)) : Option.none())
    )

    deepStrictEqual(HM.get(key(0))(result1), Option.none())
    deepStrictEqual(HM.get(key(1))(result1), Option.some(value("bb")))

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(
      map2,
      HM.filterMap((v, { n }) => n > 0 ? Option.some(v) : Option.none())
    )

    deepStrictEqual(HM.get(key(0))(result2), Option.none())
    deepStrictEqual(HM.get(key(1))(result2), Option.some(value("bb")))
  })

  it("compact", () => {
    const map = HM.make([0, Option.some("a")], [1, Option.none()])
    const result = HM.compact(map)

    assert.strictEqual(HM.unsafeGet(0)(result), "a")
    assert.throws(() => HM.unsafeGet(1)(result))
  })

  it("filter", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, HM.filter(({ s }) => s.length > 1))

    deepStrictEqual(HM.get(key(0))(result1), Option.none())
    deepStrictEqual(HM.get(key(1))(result1), Option.some(value("bb")))

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, HM.filter(({ s }, { n }) => n > 0 && s.length > 0))

    deepStrictEqual(HM.get(key(0))(result2), Option.none())
    deepStrictEqual(HM.get(key(1))(result2), Option.some(value("bb")))
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
    assert.isTrue(HM.isEmpty(HM.make()))
    assert.isFalse(HM.isEmpty(HM.make([key(0), value("a")])))
  })

  it("map", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result1 = pipe(map1, HM.map(({ s }) => s.length))

    deepStrictEqual(HM.get(key(0))(result1), Option.some(1))
    deepStrictEqual(HM.get(key(1))(result1), Option.some(2))
    deepStrictEqual(HM.get(key(2))(result1), Option.none())

    const map2 = HM.make([key(0), value("a")], [key(1), value("bb")])
    const result2 = pipe(map2, HM.map(({ s }, { n }) => n + s.length))

    deepStrictEqual(HM.get(key(0))(result2), Option.some(1))
    deepStrictEqual(HM.get(key(1))(result2), Option.some(3))
    deepStrictEqual(HM.get(key(2))(result2), Option.none())
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

    deepStrictEqual(HM.get(key(0))(result), Option.some(value("test")))
    deepStrictEqual(HM.get(key(1))(result), Option.some(value("b")))
    deepStrictEqual(HM.get(key(2))(result), Option.none())

    deepStrictEqual(
      HM.get(key(0))(pipe(
        map,
        HM.modifyAt(key(0), (): Option.Option<Value> => Option.none())
      )),
      Option.none()
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

    deepStrictEqual(HM.get(key(0))(result), Option.some(value("test")))
    deepStrictEqual(HM.get(key(1))(result), Option.some(value("b")))
    deepStrictEqual(HM.get(key(2))(result), Option.none())
  })

  it("reduce", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result1 = pipe(map1, HM.reduce("", (acc, { s }) => acc.length > 0 ? `${acc},${s}` : s))

    assert.strictEqual(result1, "a,b")

    const map2 = HM.make([key(0), value("a")], [key(1), value("b")])
    const result2 = pipe(
      map2,
      HM.reduce(
        "",
        (acc, { s }, { n }) => acc.length > 0 ? `${acc},${n}:${s}` : `${n}:${s}`
      )
    )

    assert.strictEqual(result2, "0:a,1:b")
  })

  it("remove", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.remove(key(0)))

    deepStrictEqual(HM.get(key(0))(result), Option.none())
    deepStrictEqual(HM.get(key(1))(result), Option.some(value("b")))
  })

  it("remove non existing key doesn't change the array", () => {
    const map = HM.make([13, 95], [90, 4])
    const result = pipe(map, HM.remove(75))

    deepStrictEqual(Array.from(HM.keySet(map)), Array.from(HM.keySet(result)))
  })

  it("removeMany", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.removeMany([key(0), key(1)]))

    assert.isFalse(HM.isEmpty(map))
    assert.isTrue(HM.isEmpty(result))
  })

  it("size", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = HM.size(map)

    assert.strictEqual(result, 2)
  })

  it("union", () => {
    const map1 = HM.make([0, "a"], [1, "b"])
    const map2 = HM.make(["foo", true], ["bar", false])
    const result = HM.union(map2)(map1)

    deepStrictEqual(
      pipe(result, HM.get(0)),
      Option.some("a")
    )
    deepStrictEqual(
      pipe(result, HM.get(1)),
      Option.some("b")
    )
    deepStrictEqual(
      pipe(result, HM.get("foo")),
      Option.some(true)
    )
    deepStrictEqual(
      pipe(result, HM.get("bar")),
      Option.some(false)
    )
  })

  it("modify", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = pipe(map, HM.modify(key(0), ({ s }) => value(`${s}-${s}`)))

    deepStrictEqual(HM.get(key(0))(result), Option.some(value("a-a")))
    deepStrictEqual(HM.get(key(1))(result), Option.some(value("b")))
    deepStrictEqual(HM.get(key(2))(result), Option.none())

    deepStrictEqual(
      HM.get(key(2))(pipe(map, HM.modify(key(2), ({ s }) => value(`${s}-${s}`)))),
      Option.none()
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

    assert.deepEqual([...result], [key(0), key(1)])
  })

  it("values", () => {
    const map = HM.make([key(0), value("a")], [key(1), value("b")])
    const result = Array.from(HM.values(map))

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
    expect(HM.empty<string, string>().pipe(HM.set("key", "value"))).toEqual(HM.make(["key", "value"]))
  })

  it("isHashMap", () => {
    expect(HM.isHashMap(HM.empty())).toBe(true)
    expect(HM.isHashMap(null)).toBe(false)
    expect(HM.isHashMap({})).toBe(false)
  })

  it("findFirst", () => {
    const map1 = HM.make([key(0), value("a")], [key(1), value("bb")])
    expect(HM.findFirst(map1, (_v, k) => k.n === 0)).toStrictEqual(Option.some([key(0), value("a")]))
    expect(HM.findFirst(map1, (v, _k) => v.s === "bb")).toStrictEqual(Option.some([key(1), value("bb")]))
    expect(HM.findFirst(map1, (v, k) => k.n === 0 && v.s === "bb")).toStrictEqual(Option.none())
  })
})
