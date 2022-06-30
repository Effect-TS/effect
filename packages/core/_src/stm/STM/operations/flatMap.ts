import { STMOnSuccess } from "@effect/core/stm/STM/definition/primitives"

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @tsplus static effect/core/stm/STM.Aspects flatMap
 * @tsplus pipeable effect/core/stm/STM flatMap
 */
export function flatMap<A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>) {
  return <R, E>(self: STM<R, E, A>): STM<R1 | R, E | E1, A2> => new STMOnSuccess<R1 | R, E | E1, A, A2>(self, f)
}
