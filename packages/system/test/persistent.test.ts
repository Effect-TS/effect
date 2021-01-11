import { pipe, tuple } from "../src/Function"
import type { Equatable } from "../src/Persistent/_internal/Structural"
import { equalsSymbol } from "../src/Persistent/_internal/Structural"
import * as HM from "../src/Persistent/HashMap"

describe("HashMap", () => {
  it("use hash-map", () => {
    const map = pipe(
      HM.empty<number, string>(),
      HM.set(0, "ok"),
      HM.set(1, "ko"),
      HM.set(2, "no")
    )
    expect(map).toEqual(HM.fromArray([tuple(0, "ok"), tuple(1, "ko"), tuple(2, "no")]))
  })
  it("use hash-map 2", () => {
    const map = pipe(
      HM.empty<string, string>(),
      HM.set("0", "ok"),
      HM.set("1", "ko"),
      HM.set("2", "no")
    )
    expect(map).toEqual(HM.fromObject({ 0: "ok", 1: "ko", 2: "no" }))
  })
  it("use hash-map 3", () => {
    const map = pipe(
      HM.empty<string, string>(),
      HM.set("0", "ok"),
      HM.set("1", "ko"),
      HM.set("2", "no"),
      HM.updateMap((m) => {
        HM.set_(m, "3", "oo")
        HM.set_(m, "4", "oo")
      })
    )
    expect(map).toEqual(HM.fromObject({ 0: "ok", 1: "ko", 2: "no", 3: "oo", 4: "oo" }))
  })
  it("use hash-map 4", () => {
    class Index implements Equatable {
      constructor(readonly a: number, readonly b: number) {}

      [equalsSymbol](other: any): boolean {
        return other instanceof Index && other.a === this.a && other.b === this.b
      }
    }
    interface Value {
      c: number
      d: number
    }
    const map = pipe(
      HM.empty<Index, Value>(),
      HM.set<Index, Value>(new Index(0, 1), { c: 0, d: 0 }),
      HM.set<Index, Value>(new Index(0, 1), { c: 1, d: 1 }),
      HM.set<Index, Value>(new Index(1, 1), { c: 0, d: 0 }),
      HM.set<Index, Value>(new Index(10, 1), { c: 3, d: 2 }),
      HM.set<Index, Value>(new Index(10, 1), { c: 3, d: 3 })
    )

    console.log(Array.from(map))

    expect(HM.get_(map, new Index(0, 1))).toEqual({ c: 1, d: 1 })
    expect(HM.get_(map, new Index(1, 1))).toEqual({ c: 0, d: 0 })
    //expect(HM.get_(map, new Index(1, 1))).toEqual({ c: 0, d: 0 })
  })
})
