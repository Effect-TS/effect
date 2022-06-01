/**
 * Atomically performs transactional effect for each item in array.
 *
 * @tsplus fluent ets/TArray forEach
 */
export function forEach_<E, A>(
  self: TArray<A>,
  f: (a: A) => STM<never, E, void>
): STM<never, E, void> {
  return self.reduceSTM(undefined as void, (_, a) => f(a))
}

/**
 * Atomically performs transactional effect for each item in array.
 *
 * @tsplus static ets/TArray/Aspects forEach
 */
export const forEach = Pipeable(forEach_)
