import { HashMap } from "../../../src/collection/immutable/HashMap"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { NoSuchElementException } from "../../../src/data/GlobalExceptions"
import { Option } from "../../../src/data/Option"
import * as St from "../../../src/prelude/Structural"

class Key implements St.HasHash, St.HasEquals {
  constructor(readonly n: number) {}

  get [St.hashSym](): number {
    return St.hashNumber(this.n)
  }

  [St.equalsSym](u: unknown): boolean {
    return u instanceof Key && this.n === u.n
  }
}

class Value {
  constructor(readonly s: string) {}

  get [St.hashSym](): number {
    return St.hashString(this.s)
  }

  [St.equalsSym](u: unknown): boolean {
    return u instanceof Value && this.s === u.s
  }
}

function key(n: number): Key {
  return new Key(n)
}

function value(s: string): Value {
  return new Value(s)
}

describe("HashMap", () => {
  it("has", () => {
    const hashMap = HashMap([key(0), value("a")])

    expect(hashMap.has(key(0))).toBe(true)
    expect(hashMap.has(key(1))).toBe(false)
  })

  it("hasHash", () => {
    const hashMap = HashMap([key(0), value("a")])

    expect(hashMap.hasHash(key(0), St.hash(key(0)))).toBe(true)
    expect(hashMap.hasHash(key(1), St.hash(key(0)))).toBe(false)
  })

  it("get", () => {
    const hashMap = HashMap([key(0), value("a")])

    expect(hashMap[key(0)]).toEqual(Option.some(value("a")))
    expect(hashMap[key(1)]).toEqual(Option.none)
  })

  it("getHash", () => {
    const hashMap = HashMap([key(0), value("a")])

    expect(hashMap.getHash(key(0), St.hash(0))).toEqual(Option.some(value("a")))
    expect(hashMap.getHash(key(1), St.hash(0))).toEqual(Option.none)
  })

  it("set", () => {
    let hashMap = HashMap.empty<Key, Value>()

    hashMap = hashMap.set(key(0), value("a"))

    expect(hashMap[key(0)]).toEqual(Option.some(value("a")))
  })

  it("mutation", () => {
    let hashMap = HashMap.empty()

    expect(hashMap).toHaveProperty("_editable", false)

    hashMap = hashMap.beginMutation()

    expect(hashMap).toHaveProperty("_editable", true)

    hashMap = hashMap.endMutation()

    expect(hashMap).toHaveProperty("_editable", false)
  })

  it("mutate", () => {
    const hashMap = HashMap.empty<number, string>()

    const result = hashMap.mutate((map) => {
      map.set(0, "a")
    })

    expect(result[0]).toEqual(Option.some("a"))
    expect(result[1]).toEqual(Option.none)
  })

  it("chain", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.flatMap(({ s }) => {
      const newKey = key(s.length)
      const newValue = value(s)
      return HashMap.empty<Key, Value>().set(newKey, newValue)
    })

    expect(result[key(1)]).toEqual(Option.some(value("a")))
    expect(result[key(2)]).toEqual(Option.some(value("bb")))
    expect(result[key(3)]).toEqual(Option.none)
  })

  it("chainWithIndex", () => {
    const hashMap = HashMap([key(1), value("a")], [key(2), value("bb")])

    const result = hashMap.flatMapWithIndex(({ n }, { s }) => {
      const newKey = key(s.length + n)
      const newValue = value(s)
      return HashMap.empty<Key, Value>().set(newKey, newValue)
    })

    expect(result[key(2)]).toEqual(Option.some(value("a")))
    expect(result[key(4)]).toEqual(Option.some(value("bb")))
    expect(result[key(6)]).toEqual(Option.none)
  })

  it("collect", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.collect(({ s }) =>
      s.length > 1 ? Option.some(value(s)) : Option.none
    )

    expect(result[key(0)]).toEqual(Option.none)
    expect(result[key(1)]).toEqual(Option.some(value("bb")))
  })

  it("collectWithIndex", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.collectWithIndex(({ n }, v) =>
      n > 0 ? Option.some(v) : Option.none
    )

    expect(result[key(0)]).toEqual(Option.none)
    expect(result[key(1)]).toEqual(Option.some(value("bb")))
  })

  it("compact", () => {
    const hashMap = HashMap([0, Option.some("a")], [1, Option.none])

    const result = hashMap.compact()

    expect(result.unsafeGet(0)).toBe("a")
    expect(() => result.unsafeGet(1)).toThrowError(NoSuchElementException)
  })

  it("filter", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.filter(({ s }) => s.length > 1)

    expect(result[key(0)]).toEqual(Option.none)
    expect(result[key(1)]).toEqual(Option.some(value("bb")))
  })

  it("filterWithIndex", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.filterWithIndex(({ n }, { s }) => n > 0 && s.length > 0)

    expect(result[key(0)]).toEqual(Option.none)
    expect(result[key(1)]).toEqual(Option.some(value("bb")))
  })

  it("forEach", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])
    const result: Array<string> = []

    hashMap.forEach((v) => {
      result.push(v.s)
    })

    expect(result).toEqual(["a", "b"])
  })

  it("forEachWithIndex", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])
    const result: Array<[number, string]> = []

    hashMap.forEachWithIndex(({ n }, { s }) => {
      result.push([n, s])
    })

    expect(result).toEqual([
      [0, "a"],
      [1, "b"]
    ])
  })

  it("isEmpty", () => {
    expect(HashMap().isEmpty()).toBe(true)
    expect(HashMap([key(0), value("a")]).isEmpty()).toBe(false)
  })

  it("keys", () => {
    const hashMap = HashMap([0, "a"], [1, "b"])

    const result = hashMap.keys()

    expect([...result]).toEqual([0, 1])
  })

  it("keySet", () => {
    const hashMap = HashMap(
      [key(0), value("a")],
      [key(1), value("b")],
      [key(1), value("c")]
    )

    const result = hashMap.keySet()

    expect([...result]).toEqual([key(0), key(1)])
  })

  it("map", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.map(({ s }) => s.length)

    expect(result[key(0)]).toEqual(Option.some(1))
    expect(result[key(1)]).toEqual(Option.some(2))
    expect(result[key(2)]).toEqual(Option.none)
  })

  it("mapWithIndex", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("bb")])

    const result = hashMap.mapWithIndex(({ n }, { s }) => n + s.length)

    expect(result[key(0)]).toEqual(Option.some(1))
    expect(result[key(1)]).toEqual(Option.some(3))
    expect(result[key(2)]).toEqual(Option.none)
  })

  it("modify", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.modify(key(0), (option) =>
      option.isSome() ? Option.some(value("test")) : Option.none
    )

    expect(result[key(0)]).toEqual(Option.some(value("test")))
    expect(result[key(1)]).toEqual(Option.some(value("b")))
    expect(result[key(2)]).toEqual(Option.none)
  })

  it("modifyHash", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.modifyHash(key(0), St.hash(key(0)), (option) =>
      option.isSome() ? Option.some(value("test")) : Option.none
    )

    expect(result[key(0)]).toEqual(Option.some(value("test")))
    expect(result[key(1)]).toEqual(Option.some(value("b")))
    expect(result[key(2)]).toEqual(Option.none)
  })

  it("reduce", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.reduce("", (acc, { s }) =>
      acc.length > 0 ? `${acc},${s}` : s
    )

    expect(result).toBe("a,b")
  })

  it("reduceWithIndex", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.reduceWithIndex("", (acc, { n }, { s }) =>
      acc.length > 0 ? `${acc},${n}:${s}` : `${n}:${s}`
    )

    expect(result).toBe("0:a,1:b")
  })

  it("remove", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.remove(key(0))

    expect(result[key(0)]).toEqual(Option.none)
    expect(result[key(1)]).toEqual(Option.some(value("b")))
  })

  it("removeMany", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.removeMany([key(0), key(1)])

    expect(result.isEmpty()).toBe(true)
  })

  it("size", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.size

    expect(result).toBe(2)
  })

  it("tupleIterator", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.tupleIterator()

    expect([...result]).toEqual([Tuple(key(0), value("a")), Tuple(key(1), value("b"))])
  })

  it("union", () => {
    const map1 = HashMap([0, "a"], [1, "b"])
    const map2 = HashMap(["foo", true], ["bar", false])

    const result = map1 + map2

    expect(result[0]).toEqual(Option.some("a"))
    expect(result[1]).toEqual(Option.some("b"))
    expect(result["foo"]).toEqual(Option.some(true))
    expect(result["bar"]).toEqual(Option.some(false))
  })

  it("update", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.update(key(0), ({ s }) => value(`${s}-${s}`))

    expect(result[key(0)]).toEqual(Option.some(value("a-a")))
    expect(result[key(1)]).toEqual(Option.some(value("b")))
    expect(result[key(2)]).toEqual(Option.none)
  })

  it("values", () => {
    const hashMap = HashMap([key(0), value("a")], [key(1), value("b")])

    const result = hashMap.values()

    expect([...result]).toEqual([value("a"), value("b")])
  })
})
