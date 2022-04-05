import { STMOnSuccess } from "@effect-ts/core/stm/STM/definition/primitives";

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @tsplus fluent ets/STM flatMap
 */
export function flatMap_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R, E | E1, B> {
  return new STMOnSuccess<R1 & R, E | E1, A, B>(self, f);
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @tsplus static ets/STM/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_);
