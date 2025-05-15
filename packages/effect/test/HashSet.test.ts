import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Equal, Hash, HashSet, pipe } from "effect"

class Value implements Equal.Equal {
  constructor(readonly n: number) {}

  [Hash.symbol](): number {
    return Hash.hash(this.n)
  }

  [Equal.symbol](u: unknown): boolean {
    return u instanceof Value && this.n === u.n
  }
}

describe("HashSet", () => {
  function value(n: number): Value {
    return new Value(n)
  }

  function makeTestHashSet(...values: Array<number>): HashSet.HashSet<Value> {
    return HashSet.mutate<Value>((set) => {
      for (const _value of values) {
        HashSet.add(value(_value))(set)
      }
    })(HashSet.empty())
  }

  it("toString", () => {
    const map = HashSet.make(0, "a")
    strictEqual(
      String(map),
      `{
  "_id": "HashSet",
  "values": [
    0,
    "a"
  ]
}`
    )
  })

  it("toJSON", () => {
    const map = HashSet.make(0, "a")
    deepStrictEqual(map.toJSON(), { _id: "HashSet", values: [0, "a"] })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")
    const map = HashSet.make(0, "a")
    deepStrictEqual(inspect(map), inspect({ _id: "HashSet", values: [0, "a"] }))
  })

  it("add", () => {
    const set = makeTestHashSet(0, 1, 2)

    deepStrictEqual(set, HashSet.make(value(0), value(1), value(2)))
  })

  it("mutation", () => {
    let set: any = HashSet.empty<number>()

    assertFalse(set._keyMap._editable)
    set = HashSet.beginMutation(set)
    assertTrue(set._keyMap._editable)
    set = HashSet.endMutation(set)
    assertFalse(set._keyMap._editable)
  })

  it("flatMap", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result = pipe(set, HashSet.flatMap((v) => [`${v.n}`]))

    deepStrictEqual(result, HashSet.make("0", "1", "2"))
  })

  it("difference", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)
    const result = pipe(set1, HashSet.difference(set2))

    assertTrue(Equal.equals(result, HashSet.make(value(0), value(1))))
  })

  it("every", () => {
    const set = makeTestHashSet(0, 1, 2)

    assertTrue(pipe(set, HashSet.every(({ n }) => n >= 0)))
    assertFalse(pipe(set, HashSet.every(({ n }) => n > 0)))
  })

  it("filter", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result = pipe(set, HashSet.filter(({ n }) => n > 0))

    deepStrictEqual(result, HashSet.make(value(1), value(2)))
  })

  it("forEach", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result: Array<number> = []

    pipe(
      set,
      HashSet.forEach(({ n }) => {
        result.push(n)
      })
    )

    deepStrictEqual(result, [0, 1, 2])
  })

  it("has", () => {
    const set = makeTestHashSet(0, 1, 2)

    assertTrue(pipe(set, HashSet.has(value(0))))
    assertTrue(pipe(set, HashSet.has(value(1))))
    assertTrue(pipe(set, HashSet.has(value(2))))
    assertFalse(pipe(set, HashSet.has(value(3))))
  })

  it("intersection", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)
    const result = pipe(set1, HashSet.intersection(set2))

    deepStrictEqual(result, HashSet.make(value(2)))
  })

  it("isSubset", () => {
    const set1 = makeTestHashSet(0, 1)
    const set2 = makeTestHashSet(1, 2)
    const set3 = makeTestHashSet(0, 1, 2)

    assertFalse(pipe(set1, HashSet.isSubset(set2)))
    assertTrue(pipe(set1, HashSet.isSubset(set3)))
  })

  it("map", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result = pipe(set, HashSet.map(({ n }) => value(n + 1)))

    deepStrictEqual(result, HashSet.make(value(1), value(2), value(3)))
  })

  it("mutate", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result = pipe(
      set,
      HashSet.mutate((set) => {
        pipe(set, HashSet.add(value(3)))
        pipe(set, HashSet.remove(value(0)))
      })
    )

    assertFalse(pipe(result, HashSet.has(value(0))))
    assertTrue(pipe(result, HashSet.has(value(1))))
    assertTrue(pipe(result, HashSet.has(value(2))))
    assertTrue(pipe(result, HashSet.has(value(3))))
  })

  it("partition", () => {
    const set = makeTestHashSet(0, 1, 2, 3, 4, 5)
    const result = pipe(set, HashSet.partition(({ n }) => n > 2))

    deepStrictEqual(result[0], HashSet.make(value(0), value(1), value(2)))
    deepStrictEqual(result[1], HashSet.make(value(3), value(4), value(5)))
  })

  it("remove", () => {
    const set = makeTestHashSet(0, 1, 2)
    const result = pipe(set, HashSet.remove(value(0)))

    assertFalse(pipe(result, HashSet.has(value(0))))
    assertTrue(pipe(result, HashSet.has(value(1))))
    assertTrue(pipe(result, HashSet.has(value(2))))
  })

  it("size", () => {
    const hashSet = makeTestHashSet(0, 1, 2)
    const result = HashSet.size(hashSet)

    strictEqual(result, 3)
  })

  it("some", () => {
    const set = makeTestHashSet(0, 1, 2)

    assertTrue(pipe(set, HashSet.some(({ n }) => n > 0)))
    assertFalse(pipe(set, HashSet.some(({ n }) => n > 2)))
  })

  it("toggle", () => {
    let set = makeTestHashSet(0, 1, 2)
    assertTrue(pipe(set, HashSet.has(value(0))))
    set = pipe(set, HashSet.toggle(value(0)))
    assertFalse(pipe(set, HashSet.has(value(0))))
    set = pipe(set, HashSet.toggle(value(0)))
    assertTrue(pipe(set, HashSet.has(value(0))))
  })

  it("union", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)
    const result = pipe(set1, HashSet.union(set2))

    deepStrictEqual(result, HashSet.make(value(0), value(1), value(2), value(3), value(4)))
  })

  it("values", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = Array.from(HashSet.values(hashSet))

    deepStrictEqual(result, [value(0), value(1), value(2)])
  })

  it("toValues", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = HashSet.toValues(hashSet)

    deepStrictEqual(result, [value(0), value(1), value(2)])
  })

  it("pipe()", () => {
    strictEqual(
      HashSet.empty<string>().pipe(HashSet.add("value"), HashSet.size),
      HashSet.make("value").pipe(HashSet.size)
    )
  })

  it("isHashSet", () => {
    assertTrue(HashSet.isHashSet(HashSet.empty()))
    assertFalse(HashSet.isHashSet(null))
    assertFalse(HashSet.isHashSet({}))
  })
})
