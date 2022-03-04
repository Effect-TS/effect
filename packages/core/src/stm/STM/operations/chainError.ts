import type { STM } from "../definition"

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @tsplus fluent ets/STM flatMapError
 */
export function chainError_<R, E, A, R2, E2>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R2, never, E2>
) {
  return self.flipWith((_) => _.flatMap(f))
}

/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @ets_data_first chainError_
 */
export function chainError<E, R2, E2>(f: (e: E) => STM<R2, never, E2>) {
  return <R, A>(self: STM<R, E, A>) => self.flatMapError(f)
}
