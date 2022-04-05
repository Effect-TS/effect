import type { MergeTuple } from "@tsplus/stdlib/data/Tuple";

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus operator ets/Effect &
 * @tsplus fluent ets/Effect zipFlattenPar
 */
export function zipFlattenPar_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWithPar(that, Tuple.mergeTuple);
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static ets/Effect/Aspects zipFlattenPar
 */
export const zipFlattenPar = Pipeable(zipFlattenPar_);
