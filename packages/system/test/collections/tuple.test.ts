import * as Tp from "../../src/Collections/Immutable/Tuple"
import { pipe } from "../../src/Function"

describe("Tuple", () => {
  it("update", () => {
    const res = pipe(
      Tp.tuple(0, "1", 2),
      Tp.update(0, (n) => `n: ${n} (number)`),
      Tp.update(1, (s) => `s: ${s} (string)`)
    )
    expect(res).toEqual(Tp.tuple(`n: 0 (number)`, "s: 1 (string)", 2))
  })
  it("get", () => {
    const res = pipe(
      Tp.tuple(0, "1", 2),
      Tp.update(0, (n) => `n: ${n} (number)`),
      Tp.update(1, (s) => `s: ${s} (string)`),
      Tp.update(2, (s) => `n: ${s} (number)`),
      Tp.get(0)
    )
    expect(res).toEqual(`n: 0 (number)`)
  })
})
