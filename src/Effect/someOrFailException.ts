import { NoSuchElementException } from "../GlobalExceptions"
import type * as O from "../Option"
import type { Effect } from "./effect"
import { someOrFail_ } from "./someOrFail"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 */
export function someOrFailException<S, R, E, A, E2>(
  self: Effect<S, R, E, O.Option<A>>
): Effect<S, R, E | NoSuchElementException, A> {
  return someOrFail_(self, () => new NoSuchElementException())
}
