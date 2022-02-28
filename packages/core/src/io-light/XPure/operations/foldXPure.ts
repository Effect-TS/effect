import type { XPure } from "../definition"
import { Fold } from "../definition"

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @tsplus fluent ets/XPure foldXPure
 */
export function foldXPure_<
  W,
  W1,
  W2,
  S1,
  S2,
  S3,
  S4,
  S5,
  R,
  E,
  A,
  R1,
  E1,
  B,
  R2,
  E2,
  C
>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => XPure<W1, S5, S3, R1, E1, B>,
  success: (a: A) => XPure<W2, S2, S4, R2, E2, C>
): XPure<W | W1 | W2, S1 & S5, S3 | S4, R & R1 & R2, E1 | E2, B | C> {
  return new Fold<W, W1, W2, S1 & S5, S2, S3 | S4, R & R1 & R2, E, E1 | E2, A, B | C>(
    self,
    failure,
    success
  )
}

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @ets_data_first foldXPure_
 */
export function foldXPure<W2, W3, S5, S2, E, A, S3, R1, E1, B, S4, R2, E2, C>(
  failure: (e: E) => XPure<W2, S5, S3, R1, E1, B>,
  success: (a: A) => XPure<W3, S2, S4, R2, E2, C>
) {
  return <W1, S1, R>(self: XPure<W1, S1, S2, R, E, A>) =>
    self.foldXPure(failure, success)
}
