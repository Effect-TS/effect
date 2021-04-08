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
  })
})
