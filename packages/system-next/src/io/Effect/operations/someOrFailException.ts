import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 *
 * @tsplus fluent ets/Effect someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: Effect<R, E, Option<A>>,
  __etsTrace?: string
): Effect<R, E | NoSuchElementException, A> {
  return self.someOrFail(() => new NoSuchElementException())
}
