import type { Equal } from "../src/Equal"
import { pipe } from "../src/Function"
import * as Hash from "../src/Hash"
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
    const map = pipe(
      HM.make<Index, Value>({
        ...eqIndex,
        ...hashIndex
      }),
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
    expect(HM.get_(map, new Index(0, 0))).toEqual(new Value(4, 4))
    expect(HM.get_(map, new Index(1, 1))).toEqual(undefined)
    expect(HM.has_(map, new Index(1, 1))).toEqual(false)
    expect(HM.has_(map, new Index(0, 0))).toEqual(true)
    expect(HM.has_(map, new Index(2, 2))).toEqual(true)
    expect(HM.has_(map, new Index(3, 3))).toEqual(true)
    expect(HM.get_(map, new Index(3, 3))).toEqual(new Value(6, 6))
  })
})
