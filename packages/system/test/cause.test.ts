import * as Cause from "../src/Cause"
import * as St from "../src/Structural"

describe("Cause", () => {
  it("equals", () => {
    expect(Cause.empty).equals(Cause.empty)

    expect(Cause.then(Cause.empty, Cause.empty)).equals(Cause.empty)

    expect(Cause.then(Cause.empty, Cause.both(Cause.empty, Cause.empty))).equals(
      Cause.empty
    )

    expect(Cause.then(Cause.fail("ok"), Cause.both(Cause.empty, Cause.empty))).equals(
      Cause.fail("ok")
    )

    expect(
      St.hash(Cause.then(Cause.fail("ok"), Cause.both(Cause.empty, Cause.empty)))
    ).equals(St.hash(Cause.fail("ok")))

    expect(
      Cause.then(Cause.fail("ok"), Cause.both(Cause.empty, Cause.die("ok")))
    ).equals(Cause.then(Cause.fail("ok"), Cause.die("ok")))

    expect(
      St.hash(Cause.then(Cause.fail("ok"), Cause.both(Cause.empty, Cause.die("ok"))))
    ).equals(St.hash(Cause.then(Cause.fail("ok"), Cause.die("ok"))))

    expect(
      Cause.then(Cause.fail("ok"), Cause.both(Cause.fail("ok"), Cause.die("ok")))
    ).equals(
      Cause.then(Cause.fail("ok"), Cause.both(Cause.fail("ok"), Cause.die("ok")))
    )

    expect(
      St.hash(
        Cause.then(Cause.fail("ok"), Cause.both(Cause.fail("ok"), Cause.die("ok")))
      )
    ).equals(
      St.hash(
        Cause.then(Cause.fail("ok"), Cause.both(Cause.fail("ok"), Cause.die("ok")))
      )
    )
  })
})
