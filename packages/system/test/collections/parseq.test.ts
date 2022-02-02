import * as PS from "../../src/Collections/Immutable/ParSeq/index.js"
import * as St from "../../src/Structural/index.js"

describe("Cause", () => {
  it("equals", () => {
    expect(PS.empty).equals(PS.empty)

    expect(PS.then_(PS.empty, PS.empty)).equals(PS.empty)

    expect(PS.then_(PS.empty, PS.both_(PS.empty, PS.empty))).equals(PS.empty)

    expect(PS.then_(PS.single("ok"), PS.both_(PS.empty, PS.empty))).equals(
      PS.single("ok")
    )

    expect(St.hash(PS.then_(PS.single("ok"), PS.both_(PS.empty, PS.empty)))).equals(
      St.hash(PS.single("ok"))
    )

    expect(PS.then_(PS.single("ok"), PS.both_(PS.empty, PS.single("ok")))).equals(
      PS.then_(PS.single("ok"), PS.single("ok"))
    )

    expect(
      St.hash(PS.then_(PS.single("ok"), PS.both_(PS.empty, PS.single("ok"))))
    ).equals(St.hash(PS.then_(PS.single("ok"), PS.single("ok"))))

    expect(
      PS.then_(PS.single("ok"), PS.both_(PS.single("ok"), PS.single("ok")))
    ).equals(PS.then_(PS.single("ok"), PS.both_(PS.single("ok"), PS.single("ok"))))

    expect(
      St.hash(PS.then_(PS.single("ok"), PS.both_(PS.single("ok"), PS.single("ok"))))
    ).equals(
      St.hash(PS.then_(PS.single("ok"), PS.both_(PS.single("ok"), PS.single("ok"))))
    )
  })
})
