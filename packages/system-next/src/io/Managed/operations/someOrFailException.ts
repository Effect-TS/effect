import { NoSuchElementException } from "../../../data/GlobalExceptions"
import type * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { someOrFail_ } from "./someOrFail"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 */
export function someOrFailException<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __trace?: string
): Managed<R, E | NoSuchElementException, A> {
  return someOrFail_(self, () => new NoSuchElementException(), __trace)
}
