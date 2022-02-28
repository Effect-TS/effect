import { XPure } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/XPure catchAll
 */
export function catchAll_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => XPure<W1, S1, S3, R1, E1, B>
) {
  return self.foldXPure(failure, (a) => XPure.succeed(a))
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<W, S1, E, S3, R1, E1, B>(
  failure: (e: E) => XPure<W, S1, S3, R1, E1, B>
) {
  return <W1, S2, R, A>(self: XPure<W1, S1, S2, R, E, A>) => self.catchAll(failure)
}
