/**
 * Drops elements from the queue while they do not satisfy the predicate,
 * taking and returning the first element that does satisfy the predicate.
 * Retries if no elements satisfy the predicate.
 *
 * @tsplus static effect/core/stm/THub/TDequeue.Aspects seek
 * @tsplus pipeable effect/core/stm/THub/TDequeue seek
 * @category mutations
 * @since 1.0.0
 */
export function seek<A>(f: (a: A) => boolean) {
  return (self: THub.TDequeue<A>): STM<never, never, A> =>
    self.take.flatMap(
      (b) => f(b) ? STM.succeed(b) : self.seek(f)
    )
}
