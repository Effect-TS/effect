import type { STM } from "../definition"
import { STMOnFailure } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/STM catchAll
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R1, E1, B>
): STM<R1 & R, E1, A | B> {
  return new STMOnFailure<R1 & R, E, E1, A | B>(self, f)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => STM<R1, E1, B>
): <R, A>(self: STM<R, E, A>) => STM<R1 & R, E1, A | B> {
  return (self) => self.catchAll(f)
}
