import type { Equal } from "../src/Equal"
import { pipe, tuple } from "../src/Function"
import * as Hash from "../src/Hash"
import * as O from "../src/Option"
import * as HM from "../src/Persistent/HashMap"

describe("HashMap", () => {
  it("use hash-map 4", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const eqIndex: Equal<Index> = {
      equals: (y) => (x) => x === y || (x.a === y.a && x.b === y.b)
    }
    const hashIndex: Hash.Hash<Index> = {
      hash: (x) => Hash.string(`${x.a}-${x.b}`)
    }
    const makeMap = () =>
      HM.make<Index, Value>({
        ...eqIndex,
        ...hashIndex
      })
    const map = pipe(
      makeMap(),
      HM.set(new Index(0, 0), new Value(0, 0)),
      HM.set(new Index(0, 0), new Value(1, 1)),
      HM.set(new Index(1, 1), new Value(2, 2)),
      HM.set(new Index(1, 1), new Value(3, 3)),
      HM.set(new Index(0, 0), new Value(4, 4)),
      HM.remove(new Index(1, 1)),
      HM.mutate((m) => {
        HM.set_(m, new Index(2, 2), new Value(5, 5))
        HM.set_(m, new Index(3, 3), new Value(6, 6))
      })
    )
    expect(HM.isEmpty(map)).toEqual(false)
    expect(HM.get_(map, new Index(0, 0))).toEqual(O.some(new Value(4, 4)))
    expect(HM.get_(map, new Index(1, 1))).toEqual(O.none)
    expect(HM.has_(map, new Index(1, 1))).toEqual(false)
    expect(HM.has_(map, new Index(0, 0))).toEqual(true)
    expect(HM.has_(map, new Index(2, 2))).toEqual(true)
    expect(HM.has_(map, new Index(3, 3))).toEqual(true)
    expect(HM.get_(map, new Index(3, 3))).toEqual(O.some(new Value(6, 6)))
    expect(Array.from(map)).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(2, 2), new Value(5, 5)],
      [new Index(3, 3), new Value(6, 6)]
    ])
    expect(Array.from(HM.keys(map))).toEqual([
      new Index(0, 0),
      new Index(2, 2),
      new Index(3, 3)
    ])
    expect(Array.from(HM.values(map))).toEqual([
      new Value(4, 4),
      new Value(5, 5),
      new Value(6, 6)
    ])
    expect(
      HM.reduceWithIndex_(
        map,
        [] as readonly (readonly [Index, Value])[],
        (z, k, v) => [...z, tuple(k, v)]
      )
    ).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(2, 2), new Value(5, 5)],
      [new Index(3, 3), new Value(6, 6)]
    ])
    expect(Array.from(HM.map_(map, (v) => v.d))).toEqual([
      [new Index(0, 0), 4],
      [new Index(2, 2), 5],
      [new Index(3, 3), 6]
    ])
    expect(
      Array.from(
        HM.chainWithIndex_(map, (k, v) =>
          pipe(
            makeMap(),
            HM.set(new Index(k.a + 1, k.b + 1), new Value(v.c, v.d + 1)),
            HM.set(new Index(k.a + 6, k.b + 6), new Value(v.c + 1, v.d + 1))
          )
        )
      )
    ).toEqual([
      [new Index(8, 8), new Value(6, 6)],
      [new Index(9, 9), new Value(7, 7)],
      [new Index(1, 1), new Value(4, 5)],
      [new Index(3, 3), new Value(5, 6)],
      [new Index(4, 4), new Value(6, 7)],
      [new Index(6, 6), new Value(5, 5)]
    ])
  })
  it("default", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const x = new Index(0, 0)
    const m = pipe(
      HM.makeDefault<Index, Value>(),
      HM.set(x, new Value(0, 1)),
      HM.set(x, new Value(0, 2))
    )
    expect(Array.from(m)).toEqual([[x, new Value(0, 2)]])
    const j = pipe(m, HM.set(new Index(0, 0), new Value(0, 3)))
    expect(Array.from(j)).toEqual([
      [x, new Value(0, 3)],
      [x, new Value(0, 2)]
    ])
  })
})
