// ets_tracing: off

import * as IO from "../../IO/core"
import type * as O from "../../Option/core"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Finds something and extracts some details from it.
 */
export function find_<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => O.Option<Z>
): O.Option<Z> {
  return IO.run(findSafe(self, f))
}

/**
 * Finds something and extracts some details from it.
 *
 * @ets_data_first find_
 */
export function find<E, Z>(f: (cause: Cause<E>) => O.Option<Z>) {
  return (self: Cause<E>): O.Option<Z> => find_(self, f)
}

function findSafe<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => O.Option<Z>
): IO.IO<O.Option<Z>> {
  const result = f(self)

  if (result._tag === "Some") {
    return IO.succeed(result)
  }
  realCause(self)
  switch (self._tag) {
    case "Then":
      return IO.chain_(
        IO.suspend(() => findSafe(self.left, f)),
        (leftResult) => {
          if (leftResult._tag === "Some") {
            return IO.succeed(leftResult)
          } else {
            return findSafe(self.right, f)
          }
        }
      )
    case "Both": {
      return IO.chain_(
        IO.suspend(() => findSafe(self.left, f)),
        (leftResult) => {
          if (leftResult._tag === "Some") {
            return IO.succeed(leftResult)
          } else {
            return findSafe(self.right, f)
          }
        }
      )
    }
    case "Stackless": {
      return IO.suspend(() => findSafe(self.cause, f))
    }
    default:
      return IO.succeed(result)
  }
}
