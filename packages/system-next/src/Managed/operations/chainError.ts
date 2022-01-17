import type { Managed } from "../definition"
import { chain } from "./chain"
import { flipWith_ } from "./flipWith"

/**
 * Effectfully map the error channel.
 */
export function chainError_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, never, E2>,
  __trace?: string
): Managed<R & R2, E2, A> {
  return flipWith_(self, chain(f), __trace)
}

/**
 * Effectfully map the error channel.
 *
 * @ets_data_first chainError_
 */
export function chainError<E, R2, E2>(
  f: (e: E) => Managed<R2, never, E2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A> =>
    chainError_(self, f, __trace)
}
