import { pipe, tuple } from "../src/Function"
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
})
