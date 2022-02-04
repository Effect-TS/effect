import { HashSet } from "../../../src/collection/immutable/HashSet"
import * as St from "../../../src/prelude/Structural"

class Value {
  constructor(readonly n: number) {}

  get [St.hashSym](): number {
    return St.hashNumber(this.n)
  }

  [St.equalsSym](u: unknown): boolean {
    return u instanceof Value && this.n === u.n
  }
}

function value(n: number): Value {
  return new Value(n)
}

function makeTestHashSet(...values: Array<number>): HashSet<Value> {
  const hashSet = HashSet<Value>()
  return hashSet.mutate((set) => {
    for (const v of values) {
      set.add(value(v))
    }
  })
}

describe("HashSet", () => {
  it("add", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    expect([...hashSet]).toEqual([value(0), value(1), value(2)])
  })

  it("mutation", () => {
    let hashSet = HashSet()

    expect(hashSet).toHaveProperty("_keyMap._editable", false)

    hashSet = hashSet.beginMutation()

    expect(hashSet).toHaveProperty("_keyMap._editable", true)

    hashSet = hashSet.endMutation()

    expect(hashSet).toHaveProperty("_keyMap._editable", false)
  })

  it("chain", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.flatMap((v) => [`${v.n}`])

    expect([...result].sort()).toEqual(["0", "1", "2"])
  })

  it("difference", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)

    const result = set1.difference(set2)

    expect([...result]).toEqual([value(0), value(1)])
  })

  it("equal", () => {
    const E = HashSet.equal<Value>()
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)
    const set3 = makeTestHashSet(0, 1, 2)

    expect(E.equals(set1, set2)).toBe(false)
    expect(E.equals(set1, set3)).toBe(true)
  })

  it("every", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    expect(hashSet.every(({ n }) => n >= 0)).toBe(true)
    expect(hashSet.every(({ n }) => n > 0)).toBe(false)
  })

  it("filter", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.filter(({ n }) => n > 0)

    expect([...result]).toEqual([value(1), value(2)])
  })

  it("forEach", () => {
    const hashSet = makeTestHashSet(0, 1, 2)
    const result: Array<number> = []

    hashSet.forEach(({ n }) => {
      result.push(n)
    })

    expect(result).toEqual([0, 1, 2])
  })

  it("from", () => {
    const hashSet = HashSet.from([
      value(0),
      value(0),
      value(1),
      value(1),
      value(2),
      value(2)
    ])

    expect([...hashSet]).toEqual([value(0), value(1), value(2)])
  })

  it("has", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    expect(hashSet.has(value(0))).toBe(true)
    expect(hashSet.has(value(1))).toBe(true)
    expect(hashSet.has(value(2))).toBe(true)
    expect(hashSet.has(value(3))).toBe(false)
  })

  it("intersection", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)

    const result = set1.intersection(set2)

    expect([...result]).toEqual([value(2)])
  })

  it("isSubset", () => {
    const set1 = makeTestHashSet(0, 1)
    const set2 = makeTestHashSet(1, 2)
    const set3 = makeTestHashSet(0, 1, 2)

    expect(set1.isSubset(set2)).toBe(false)
    expect(set1.isSubset(set3)).toBe(true)
  })

  it("map", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.map(({ n }) => value(n + 1))

    expect([...result]).toEqual([value(1), value(2), value(3)])
  })

  it("mutate", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.mutate((set) => {
      set.add(value(3))
      set.remove(value(0))
    })

    expect(result.has(value(0))).toBe(false)
    expect(result.has(value(1))).toBe(true)
    expect(result.has(value(2))).toBe(true)
    expect(result.has(value(3))).toBe(true)
  })

  it("partition", () => {
    const hashSet = makeTestHashSet(0, 1, 2, 3, 4, 5)

    const result = hashSet.partition(({ n }) => n > 2)

    expect([...result.get(0)]).toEqual([value(0), value(1), value(2)])
    expect([...result.get(1)]).toEqual([value(3), value(4), value(5)])
  })

  it("remove", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.remove(value(0))

    expect(result.has(value(0))).toBe(false)
    expect(result.has(value(1))).toBe(true)
    expect(result.has(value(2))).toBe(true)
  })

  it("size", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.size

    expect(result).toBe(3)
  })

  it("some", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    expect(hashSet.some(({ n }) => n > 0)).toBe(true)
    expect(hashSet.some(({ n }) => n > 2)).toBe(false)
  })

  it("toggle", () => {
    let hashSet = makeTestHashSet(0, 1, 2)

    expect(hashSet.has(value(0))).toBe(true)

    hashSet = hashSet.toggle(value(0))

    expect(hashSet.has(value(0))).toBe(false)

    hashSet = hashSet.toggle(value(0))

    expect(hashSet.has(value(0))).toBe(true)
  })

  it("union", () => {
    const set1 = makeTestHashSet(0, 1, 2)
    const set2 = makeTestHashSet(2, 3, 4)

    const result = set1.union(set2)

    expect([...result]).toEqual([value(0), value(1), value(2), value(3), value(4)])
  })

  it("values", () => {
    const hashSet = makeTestHashSet(0, 1, 2)

    const result = hashSet.values()

    expect([...result]).toEqual([value(0), value(1), value(2)])
  })
})
