import { Cause, Empty, Then, Both } from "./cause"

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripInterrupts = <E>(cause: Cause<E>): Cause<E> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return cause
    }
    case "Interrupt": {
      return Empty
    }
    case "Die": {
      return cause
    }
    case "Both": {
      return Both(stripInterrupts(cause.left), stripInterrupts(cause.right))
    }
    case "Then": {
      return Then(stripInterrupts(cause.left), stripInterrupts(cause.right))
    }
  }
}
