import type { RealCause } from "@effect/core/io/Cause/definition"
import { realCause } from "@effect/core/io/Cause/definition"

/**
 * Folds over the cause to statefully compute a value.
 *
 * @tsplus static effect/core/io/Cause.Aspects foldLeft
 * @tsplus pipeable effect/core/io/Cause foldLeft
 */
export function foldLeft<E, Z>(
  initial: Z,
  f: (z: Z, cause: Cause<E>) => Maybe<Z>
) {
  return (self: Cause<E>): Z => {
    let acc: Z = initial
    realCause(self)
    let current: RealCause<E> | undefined = self
    let causes: Stack<Cause<E>> | undefined = undefined

    while (current) {
      const result = f(acc, current)

      acc = result._tag === "Some" ? result.value : acc
      realCause(current)
      switch (current._tag) {
        case "Then": {
          causes = new Stack(current.right, causes)
          realCause(current.left)
          current = current.left
          break
        }
        case "Both": {
          causes = new Stack(current.right, causes)
          realCause(current.left)
          current = current.left
          break
        }
        case "Stackless": {
          realCause(current.cause)
          current = current.cause
          break
        }
        default: {
          current = undefined
          break
        }
      }

      if (!current && causes) {
        realCause(causes.value)
        current = causes.value
        causes = causes.previous
      }
    }

    return acc
  }
}
