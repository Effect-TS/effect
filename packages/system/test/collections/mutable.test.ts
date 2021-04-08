import * as HM from "../../src/Collections/Mutable/HashMap"
import * as Equal from "../../src/Equal"
import { pipe } from "../../src/Function"
import * as Hash from "../../src/Hash"
import * as O from "../../src/Option"

describe("Mutable HashMap", () => {
  it("use hash-map", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const eqIndex = Equal.makeEqual<Index>(
      (x, y) => x === y || (x.a === y.a && x.b === y.b)
    )
    const hashIndex = Hash.makeHash<Index>((x) => Hash.string(`${x.a}-${x.b}`))

    const map = pipe(
      HM.make<Index, Value>(eqIndex, hashIndex),
      HM.set(new Index(0, 0), new Value(0, 0)),
      HM.set(new Index(0, 0), new Value(1, 1)),
      HM.set(new Index(1, 1), new Value(2, 2)),
      HM.set(new Index(1, 1), new Value(3, 3)),
      HM.set(new Index(0, 0), new Value(4, 4))
    )

    expect(Array.from(map)).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(1, 1), new Value(3, 3)]
    ])
    expect(HM.get_(map, new Index(1, 1))).toEqual(O.some(new Value(3, 3)))
    expect(HM.size(map)).toEqual(2)

    HM.remove_(map, new Index(0, 0))

    expect(Array.from(map)).toEqual([[new Index(1, 1), new Value(3, 3)]])
    expect(HM.size(map)).toEqual(1)

    HM.modify_(map, new Index(1, 1), () => O.some(new Value(4, 4)))

    expect(Array.from(map)).toEqual([[new Index(1, 1), new Value(4, 4)]])
    expect(HM.size(map)).toEqual(1)

    HM.update_(map, new Index(1, 1), (v) => new Value(v.c + 1, v.d + 1))

    expect(Array.from(map)).toEqual([[new Index(1, 1), new Value(5, 5)]])
    expect(HM.size(map)).toEqual(1)

    HM.modify_(map, new Index(1, 1), () => O.none)

    expect(Array.from(map)).toEqual([])
    expect(HM.size(map)).toEqual(0)
  })
  it("use hash-map degenerate", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}
    }
    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }
    const eqIndex = Equal.makeEqual<Index>(
      (x, y) => x === y || (x.a === y.a && x.b === y.b)
    )
    const hashIndex = Hash.makeHash<Index>(() => 0)

    const map = pipe(
      HM.make<Index, Value>(eqIndex, hashIndex),
      HM.set(new Index(0, 0), new Value(0, 0)),
      HM.set(new Index(0, 0), new Value(1, 1)),
      HM.set(new Index(1, 1), new Value(2, 2)),
      HM.set(new Index(1, 1), new Value(3, 3)),
      HM.set(new Index(0, 0), new Value(4, 4))
    )

    expect(Array.from(map)).toEqual([
      [new Index(0, 0), new Value(4, 4)],
      [new Index(1, 1), new Value(3, 3)]
    ])
    expect(HM.get_(map, new Index(1, 1))).toEqual(O.some(new Value(3, 3)))
    expect(HM.size(map)).toEqual(2)

    HM.remove_(map, new Index(0, 0))

    expect(Array.from(map)).toEqual([[new Index(1, 1), new Value(3, 3)]])
    expect(HM.size(map)).toEqual(1)
  })
})
