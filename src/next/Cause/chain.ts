import { Cause, Empty, Then, Both } from "./cause"

/**
 * Builds a Cause depending on the result of another
 */
export const chain = <E, E1>(f: (_: E) => Cause<E1>) => (
  cause: Cause<E>
): Cause<E1> => {
  switch (cause._tag) {
    case "Empty": {
      return Empty
    }
    case "Fail": {
      return f(cause.value)
    }
    case "Die": {
      return cause
    }
    case "Interrupt": {
      return cause
    }
    case "Then": {
      return Then(chain(f)(cause.left), chain(f)(cause.right))
    }
    case "Both": {
      return Both(chain(f)(cause.left), chain(f)(cause.right))
    }
  }
}
