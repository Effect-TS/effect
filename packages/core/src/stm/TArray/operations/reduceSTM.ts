import { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically folds using a transactional function.
 *
 * @tsplus fluent ets/TArray reduceSTM
 */
export function reduceSTM_<E, A, Z>(
  self: TArray<A>,
  zero: Z,
  f: (z: Z, a: A) => STM<unknown, E, Z>
): STM<unknown, E, Z> {
  return self.toChunk().flatMap((as) => STM.reduce(as, zero, f))
}

/**
 * Atomically folds using a transactional function.
 *
 * @ets_data_first reduceSTM_
 */
export function reduceSTM<E, A, Z>(zero: Z, f: (z: Z, a: A) => STM<unknown, E, Z>) {
  return (self: TArray<A>): STM<unknown, E, Z> => self.reduceSTM(zero, f)
}
