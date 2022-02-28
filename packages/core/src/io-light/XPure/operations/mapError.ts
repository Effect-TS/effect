import { XPure } from "../definition"

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @tsplus fluent ets/XPure mapError
 */
export function mapError_<W, S1, S2, R, E, A, E1>(
  self: XPure<W, S1, S2, R, E, A>,
  f: (e: E) => E1
) {
  return self.catchAll((e) => XPure.fail(f(e)))
}

/**
 * Transforms the error type of this computation with the specified
 * function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <W, S1, S2, R, A>(self: XPure<W, S1, S2, R, E, A>) => self.mapError(f)
}
