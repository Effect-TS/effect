import type { Option } from "../../../data/Option"
import { IO } from "../../../io-light/IO"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Finds something and extracts some details from it.
 *
 * @tsplus fluent ets/Cause find
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
      // @ts-expect-error
      return IO.suspend(findSafe(self.left, f)).flatMap((leftResult) =>
        leftResult._tag === "Some" ? IO.succeedNow(leftResult) : findSafe(self.right, f)
      )
    case "Both": {
      // @ts-expect-error
      return IO.suspend(findSafe(self.left, f)).flatMap((leftResult) =>
        leftResult._tag === "Some" ? IO.succeedNow(leftResult) : findSafe(self.right, f)
      )
    }
    case "Stackless": {
      return IO.suspend(findSafe(self.cause, f))
    }
    default:
      return IO.succeed(result)
  }
}
