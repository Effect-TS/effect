import type { Cause } from "../../Cause"
import type { Exit } from "../definition"

/**
 * Folds over the value or cause.
 */
export function fold_<E, A, Z>(
  self: Exit<E, A>,
  failed: (cause: Cause<E>) => Z,
  completed: (a: A) => Z
): Z {
  switch (self._tag) {
    case "Failure":
      return failed(self.cause)
    case "Success":
      return completed(self.value)
  }
}

/**
 * Folds over the value or cause.
 *
 * @ets_data_first fold_
 */
export function fold<E, Z, A>(failed: (cause: Cause<E>) => Z, completed: (a: A) => Z) {
  return (self: Exit<E, A>): Z => fold_(self, failed, completed)
}
