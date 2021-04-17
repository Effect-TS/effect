import { identity, pipe } from "@effect-ts/system/Function"

import * as PS from "../../src/Collections/Immutable/ParSeq"

describe("ParSeq", () => {
  it("fold", () => {
    expect(
      pipe(
        PS.empty,
        PS.then(PS.single("a")),
        PS.then(PS.single("b")),
        PS.both(PS.single("c")),
        PS.fold(
          "*",
          identity,
          (l, r) => `(${l} ++ ${r})`,
          (l, r) => `(${l} && ${r})`
        )
      )
    ).equals("(((* ++ a) ++ b) && c)")
  })
  it("isEmpty", () => {
    expect(
      pipe(
        PS.empty,
        PS.then(PS.single("a")),
        PS.then(PS.single("b")),
        PS.both(PS.single("c")),
        PS.isEmpty
      )
    ).equals(false)
    expect(
      pipe(
        PS.empty,
        PS.then(PS.empty),
        PS.then(PS.empty),
        PS.both(PS.empty),
        PS.isEmpty
      )
    ).equals(true)
  })
})
