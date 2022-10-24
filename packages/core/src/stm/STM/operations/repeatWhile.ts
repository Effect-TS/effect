import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Repeats this `STM` effect while its result satisfies the specified
 * predicate. **WARNING**: `repeatWhile` uses a busy loop to repeat the
 * effect and will consume a thread until it completes (it cannot yield). This
 * is because STM describes a single atomic transaction which must either
 * complete, retry or fail a transaction before yielding back to the ZIO
 * Runtime.
 *   - Use `retryWhile` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually not satisfy the
 *     predicate.
 *   - Consider using the Blocking thread pool for execution of the
 *     transaction.
 *
 * @tsplus static effect/core/stm/STM.Aspects repeatWhile
 * @tsplus pipeable effect/core/stm/STM repeatWhile
 * @category repetition
 * @since 1.0.0
 */
export function repeatWhile<A>(f: Predicate<A>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> =>
    self.flatMap((a) => (f(a) ? self.repeatWhile(f) : STM.succeed(a)))
}
