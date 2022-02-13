import * as Tp from "../src/Collections/Immutable/Tuple"
import * as Ord from "../src/Ord/index.js"

describe("Ord", () => {
  it("tuple", async () => {
    const ord = Ord.tuple(Ord.string, Ord.number, Ord.boolean)

    expect(ord.compare(Tp.tuple("a", 1, true), Tp.tuple("b", 1, true))).toEqual(-1)
    expect(ord.compare(Tp.tuple("a", 1, true), Tp.tuple("a", 2, true))).toEqual(-1)
    expect(ord.compare(Tp.tuple("a", 1, true), Tp.tuple("a", 1, false))).toEqual(1)
    expect(ord.compare(Tp.tuple("a", 1, true), Tp.tuple("a", 1, true))).toEqual(0)
  })
})
