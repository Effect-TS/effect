import * as L from "../../system/src/List"
import { pipe } from "../src/Function"

describe("List", () => {
  it("use list", () => {
    expect(
      pipe(
        L.of(1),
        L.chain((n) => L.of(n + 1)),
        L.chain((n) => L.range_(0, n)),
        L.toArray
      )
    ).toEqual([0, 1])
  })
})
