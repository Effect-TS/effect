import * as Cause from "../src/Cause/index.js"
import * as St from "../src/Structural/index.js"

describe("Cause", () => {
  it("equals", () => {
    expect(Cause.empty).equals(Cause.empty)

    expect(Cause.combineSeq(Cause.empty, Cause.empty)).equals(Cause.empty)

    expect(
      Cause.combineSeq(Cause.empty, Cause.combinePar(Cause.empty, Cause.empty))
    ).equals(Cause.empty)

    expect(
      Cause.combineSeq(Cause.fail("ok"), Cause.combinePar(Cause.empty, Cause.empty))
    ).equals(Cause.fail("ok"))

    expect(
      St.hash(
        Cause.combineSeq(Cause.fail("ok"), Cause.combinePar(Cause.empty, Cause.empty))
      )
    ).equals(St.hash(Cause.fail("ok")))

    expect(
      Cause.combineSeq(Cause.fail("ok"), Cause.combinePar(Cause.empty, Cause.die("ok")))
    ).equals(Cause.combineSeq(Cause.fail("ok"), Cause.die("ok")))

    expect(
      St.hash(
        Cause.combineSeq(
          Cause.fail("ok"),
          Cause.combinePar(Cause.empty, Cause.die("ok"))
        )
      )
    ).equals(St.hash(Cause.combineSeq(Cause.fail("ok"), Cause.die("ok"))))

    expect(
      Cause.combineSeq(
        Cause.fail("ok"),
        Cause.combinePar(Cause.fail("ok"), Cause.die("ok"))
      )
    ).equals(
      Cause.combineSeq(
        Cause.fail("ok"),
        Cause.combinePar(Cause.fail("ok"), Cause.die("ok"))
      )
    )

    expect(
      St.hash(
        Cause.combineSeq(
          Cause.fail("ok"),
          Cause.combinePar(Cause.fail("ok"), Cause.die("ok"))
        )
      )
    ).equals(
      St.hash(
        Cause.combineSeq(
          Cause.fail("ok"),
          Cause.combinePar(Cause.fail("ok"), Cause.die("ok"))
        )
      )
    )
  })
})
