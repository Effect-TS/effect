/**
 * Drops elements from the queue while they do not satisfy the predicate,
 * taking and returning the first element that does satisfy the predicate.
 * Retries if no elements satisfy the predicate.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects seek
 * @tsplus pipeable effect/core/stm/TQueue seek
 */
export function seek<A>(f: (a: A) => boolean) {
  return (self: TQueue<A>): STM<never, never, A> =>
    self.take.flatMap(
      (b) => f(b) ? STM.succeedNow(b) : self.seek(f)
    )
}
