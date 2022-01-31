import type { Managed } from "../definition"

/**
 * Effectfully map the error channel.
 *
 * @tsplus fluent ets/Managed flatMapError
 */
export function chainError_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, never, E2>,
  __etsTrace?: string
): Managed<R & R2, E2, A> {
  return self.flipWith((_) => _.flatMap(f))
}

/**
 * Effectfully map the error channel.
 *
 * @ets_data_first chainError_
 */
export function chainError<E, R2, E2>(
  f: (e: E) => Managed<R2, never, E2>,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A> => chainError_(self, f)
}
