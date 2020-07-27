import * as E from "../../Either"

import { Cause, Empty, Fail, Then, Both } from "./cause"

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export const sequenceCauseEither = <E, A>(
  c: Cause<E.Either<E, A>>
): E.Either<Cause<E>, A> => {
  switch (c._tag) {
    case "Empty": {
      return E.left(Empty)
    }
    case "Interrupt": {
      return E.left(c)
    }
    case "Fail": {
      return c.value._tag === "Left"
        ? E.left(Fail(c.value.left))
        : E.right(c.value.right)
    }
    case "Die": {
      return E.left(c)
    }
    case "Then": {
      const [l, r] = [sequenceCauseEither(c.left), sequenceCauseEither(c.right)]

      if (l._tag === "Left") {
        if (r._tag === "Right") {
          return E.right(r.right)
        } else {
          return E.left(Then(l.left, r.left))
        }
      } else {
        return E.right(l.right)
      }
    }
    case "Both": {
      const [l, r] = [sequenceCauseEither(c.left), sequenceCauseEither(c.right)]

      if (l._tag === "Left") {
        if (r._tag === "Right") {
          return E.right(r.right)
        } else {
          return E.left(Both(l.left, r.left))
        }
      } else {
        return E.right(l.right)
      }
    }
  }
}
