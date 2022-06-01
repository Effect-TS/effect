import { STMOnFailure } from "@effect/core/stm/STM/definition/primitives"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/STM catchAll
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R1, E1, B>
): STM<R1 | R, E1, A | B> {
  return new STMOnFailure<R1 | R, E, E1, A | B>(self, f)
}

/**
 * Recovers from all errors.
 *
 * @tsplus static ets/STM/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_)
