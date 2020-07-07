import { Cause, Empty, Then, Both } from "./cause"

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripFailures = <E>(cause: Cause<E>): Cause<never> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return Empty
    }
    case "Interrupt": {
      return cause
    }
    case "Die": {
      return cause
    }
    case "Both": {
      return Both(stripFailures(cause.left), stripFailures(cause.right))
    }
    case "Then": {
      return Then(stripFailures(cause.left), stripFailures(cause.right))
    }
  }
}
