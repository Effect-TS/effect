import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type * as O from "../../../data/Option"
import type { Managed } from "../definition"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 *
 * @ets fluent ets/Managed someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __etsTrace?: string
): Managed<R, E | NoSuchElementException, A> {
  return self.someOrFail(new NoSuchElementException())
}
