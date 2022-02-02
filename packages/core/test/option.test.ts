import * as A from "../src/Associative"
import { pipe } from "../src/Function"
import * as I from "../src/Identity"
import * as O from "../src/Option"
import * as Ord from "../src/Ord"

describe("Option", () => {
  it("getApplyIdentity", () => {
    const identity = I.makeIdentity(0, A.max(Ord.number).combine)

    let result = pipe(
      [O.some(3), O.some(5), O.some(2)],
      I.fold(O.getApplyIdentity(identity))
    )

    expect(result).toEqual(O.some(5))

    result = pipe([O.some(3), O.some(5), O.none], I.fold(O.getApplyIdentity(identity)))

    expect(result).toEqual(O.none)
  })
})
