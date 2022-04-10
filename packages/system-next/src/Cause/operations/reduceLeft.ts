// ets_tracing: off

import type * as O from "../../Option"
import { Stack } from "../../Stack"
import type { Cause } from "../definition"

/**
 * Folds over the cause to statefully compute a value.
 */
export function reduceLeft_<E, Z>(
  self: Cause<E>,
  initial: Z,
  f: (z: Z, cause: Cause<E>) => O.Option<Z>
): Z {
  let acc: Z = initial
  let current: Cause<E> | undefined = self
  let causes: Stack<Cause<E>> | undefined = undefined

  while (current) {
    const result = f(acc, current)

    acc = result._tag === "Some" ? result.value : acc

    switch (current._tag) {
      case "Then": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Both": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Stackless": {
        current = current.cause
        break
      }
      default: {
        current = undefined
        break
      }
    }

    if (!current && causes) {
      current = causes.value
      causes = causes.previous
    }
  }

  return acc
}

/**
 * Folds over the cause to statefully compute a value.
 *
 * @ets_data_first reduceLeft_
 */
export function reduceLeft<E, Z>(
  initial: Z,
  f: (z: Z, cause: Cause<E>) => O.Option<Z>
) {
  return (self: Cause<E>): Z => reduceLeft_(self, initial, f)
}
