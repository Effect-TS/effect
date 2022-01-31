import * as L from "../../src/Collections/Immutable/List/index.js"
import { pipe } from "../../src/Function/index.js"
import * as O from "../../src/Option/index.js"

describe("List", () => {
  it("find", () => {
    expect(
      pipe(
        L.from([0, 1, 2, 3, 4]),
        L.find((n) => n > 1)
      )
    ).toEqual(O.some(2))
    expect(
      pipe(
        L.from([0, 1, 2, 3, 4]),
        L.find((n) => n > 4)
      )
    ).toEqual(O.none)
  })
  it("findLast", () => {
    expect(
      pipe(
        L.from([0, 1, 2, 3, 4]),
        L.findLast((n) => n > 1)
      )
    ).toEqual(O.some(4))
    expect(
      pipe(
        L.from([0, 1, 2, 3, 4]),
        L.findLast((n) => n > 4)
      )
    ).toEqual(O.none)
  })
})
