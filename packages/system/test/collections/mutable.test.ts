import * as HM from "../../src/Collections/Mutable/HashMap/index.js"
import * as HS from "../../src/Collections/Mutable/HashSet/index.js"
import { pipe } from "../../src/Function/index.js"
import * as O from "../../src/Option/index.js"
import * as St from "../../src/Structural/index.js"

describe("Mutable HashMap", () => {
  it("use hash-map", () => {
    class Index {
      constructor(readonly a: number, readonly b: number) {}

      [St.equalsSym](that: unknown): boolean {
        return that instanceof Index && this.a === that.a && this.b === that.b
      }

      [St.hashSym]() {
        return St.hashString(`${this.a}-${this.b}`)
      }
    }

    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }

    const map = pipe(
      HM.make<Index, Value>(),
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

      [St.equalsSym](that: unknown): boolean {
        return that instanceof Index && this.a === that.a && this.b === that.b
      }

      [St.hashSym]() {
        return St.hashString(`${this.a}-${this.b}`)
      }
    }

    class Value {
      constructor(readonly c: number, readonly d: number) {}
    }

    const map = pipe(
      HM.make<Index, Value>(),
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

  it("from", () => {
    expect(
      HM.from([
        [1, 2],
        [3, 4]
      ])
    ).toEqual(pipe(HM.make<number, number>(), HM.set(1, 2), HM.set(3, 4)))
  })
})
describe("Mutable HashSet", () => {
  it("from", () => {
    const s = HS.make<number>()
    s.add(1)
    s.add(2)
    expect(HS.from([1, 2])).toEqual(s)
  })
})
