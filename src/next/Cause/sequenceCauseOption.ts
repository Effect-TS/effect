import * as O from "../../Option"

import { Cause, Empty, Fail, Then, Both } from "./cause"

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export const sequenceCauseOption = <E>(c: Cause<O.Option<E>>): O.Option<Cause<E>> => {
  switch (c._tag) {
    case "Empty": {
      return O.some(Empty)
    }
    case "Interrupt": {
      return O.some(c)
    }
    case "Fail": {
      return O.map_(c.value, Fail)
    }
    case "Die": {
      return O.some(c)
    }
    case "Then": {
      const [l, r] = [sequenceCauseOption(c.left), sequenceCauseOption(c.right)]

      if (l._tag === "Some" && r._tag === "Some") {
        return O.some(Then(l.value, r.value))
      } else if (l._tag === "Some") {
        return O.some(l.value)
      } else if (r._tag === "Some") {
        return O.some(r.value)
      } else {
        return O.none
      }
    }
    case "Both": {
      const [l, r] = [sequenceCauseOption(c.left), sequenceCauseOption(c.right)]

      if (l._tag === "Some" && r._tag === "Some") {
        return O.some(Both(l.value, r.value))
      } else if (l._tag === "Some") {
        return O.some(l.value)
      } else if (r._tag === "Some") {
        return O.some(r.value)
      } else {
        return O.none
      }
    }
  }
}
