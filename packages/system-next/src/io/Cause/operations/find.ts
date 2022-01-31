import type { Option } from "../../../data/Option/core"
import { IO } from "../../../io-light/IO/core"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Finds something and extracts some details from it.
 *
 * @ets fluent ets/Cause find
 */
export function find_<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Option<Z>
): Option<Z> {
  return findSafe(self, f).run()
}

/**
 * Finds something and extracts some details from it.
 *
 * @ets_data_first find_
 */
export function find<E, Z>(f: (cause: Cause<E>) => Option<Z>) {
  return (self: Cause<E>): Option<Z> => self.find(f)
}

function findSafe<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Option<Z>
): IO<Option<Z>> {
  const result = f(self)

  if (result._tag === "Some") {
    return IO.succeed(result)
  }
  realCause(self)
  switch (self._tag) {
    case "Then":
      return IO.suspend(findSafe(self.left, f)).flatMap((leftResult) => {
        if (leftResult._tag === "Some") {
          return IO.succeedNow(leftResult)
        } else {
          return findSafe(self.right, f)
        }
      })
    case "Both": {
      return IO.suspend(findSafe(self.left, f)).flatMap((leftResult) => {
        if (leftResult._tag === "Some") {
          return IO.succeedNow(leftResult)
        } else {
          return findSafe(self.right, f)
        }
      })
    }
    case "Stackless": {
      return IO.suspend(findSafe(self.cause, f))
    }
    default:
      return IO.succeed(result)
  }
}
