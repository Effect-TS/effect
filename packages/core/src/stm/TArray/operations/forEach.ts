import type { STM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically performs transactional effect for each item in array.
 *
 * @tsplus fluent ets/TArray forEach
 */
export function forEach_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<unknown, E, void>
): STM<unknown, E, void> {
  return self.reduceSTM(undefined as void, (_, a) => f(a))
}

/**
 * Atomically performs transactional effect for each item in array.
 *
 * @ets_data_first forEach_
 */
export function forEach<E, A>(f: (a: A) => STM<unknown, E, void>) {
  return (self: TArray<A>): STM<unknown, E, void> => self.forEach(f)
}
