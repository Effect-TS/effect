import * as Cause from "../src/Cause"
import { flipCauseEither } from "../src/Cause"
import * as E from "../src/Either"
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

  describe("flipCauseEither", () => {
    it("should work with Empty", () => {
      const result = flipCauseEither(Cause.empty)

      if (E.isRight(result)) {
        return fail("Should be left")
      }

      expect(St.equals(result.left, Cause.empty)).toBe(true)
    })

    it("should work with Then", () => {
      const result = flipCauseEither(Cause.then(Cause.die(10), Cause.die(20)))

      if (E.isRight(result)) {
        return fail("Should be left")
      }

      if (result.left._tag !== "Then") {
        return fail("Should be Then")
      }

      expect(St.equals(result.left.left, Cause.die(10))).toBe(true)
      expect(St.equals(result.left.right, Cause.die(20))).toBe(true)
    })

    it("should work with Both", () => {
      const result = flipCauseEither(
        Cause.both(Cause.die(10), Cause.then(Cause.die(15), Cause.die(20)))
      )

      if (E.isRight(result)) {
        return fail("Should be left")
      }

      if (result.left._tag !== "Both") {
        return fail("Should be Both")
      }

      expect(St.equals(result.left.left, Cause.die(10))).toBe(true)
      expect(
        St.equals(result.left.right, Cause.then(Cause.die(15), Cause.die(20)))
      ).toBe(true)
    })
  })
})
