import { STMOnFailure } from "@effect/core/stm/STM/definition/primitives"

/**
 * Recovers from all errors.
 *
 * @tsplus static effect/core/stm/STM.Aspects catchAll
 * @tsplus pipeable effect/core/stm/STM catchAll
 */
export function catchAll<E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>) {
  return <R, A>(self: STM<R, E, A>): STM<R1 | R, E1, A | B> =>
    new STMOnFailure<R1 | R, E, E1, A | B>(self, f)
}
