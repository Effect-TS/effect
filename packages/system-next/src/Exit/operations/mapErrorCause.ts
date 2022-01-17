import type { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { Failure } from "../definition"

/**
 * Maps over the cause type.
 */
export function mapErrorCause_<E, A, E1>(
  self: Exit<E, A>,
  f: (cause: Cause<E>) => Cause<E1>
): Exit<E1, A> {
  switch (self._tag) {
    case "Failure":
      return new Failure(f(self.cause))
    case "Success":
      return self
  }
}

/**
 * Maps over the cause type.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E1>(f: (cause: Cause<E>) => Cause<E1>) {
  return <A>(self: Exit<E, A>): Exit<E1, A> => mapErrorCause_(self, f)
}
