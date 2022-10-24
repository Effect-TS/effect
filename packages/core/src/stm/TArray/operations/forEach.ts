/**
 * Atomically performs transactional effect for each item in array.
 *
 * @tsplus static effect/core/stm/TArray.Aspects forEach
 * @tsplus pipeable effect/core/stm/TArray forEach
 * @category traversing
 * @since 1.0.0
 */
export function forEach<E, A>(f: (a: A) => STM<never, E, void>) {
  return (self: TArray<A>): STM<never, E, void> =>
    self.reduceSTM(
      undefined as void,
      (_, a) => f(a)
    )
}
