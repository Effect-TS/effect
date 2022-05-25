/**
 * Repeats this `STM` effect until its result satisfies the specified
 * predicate. **WARNING**: `repeatUntil` uses a busy loop to repeat the
 * effect and will consume a thread until it completes (it cannot yield). This
 * is because STM describes a single atomic transaction which must either
 * complete, retry or fail a transaction before yielding back to the ZIO
 * Runtime.
 *   - Use `retryUntil` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually satisfy the predicate.
 *   - Consider using the Blocking thread pool for execution of the
 *     transaction.
 *
 * @tsplus fluent ets/STM repeatUntil
 */
export function repeatUntil_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>
): STM<R, E, A> {
  return self.flatMap((a) => (f(a) ? STM.succeedNow(a) : self.repeatUntil(f)))
}

/**
 * Repeats this `STM` effect until its result satisfies the specified
 * predicate. **WARNING**: `repeatUntil` uses a busy loop to repeat the
 * effect and will consume a thread until it completes (it cannot yield). This
 * is because STM describes a single atomic transaction which must either
 * complete, retry or fail a transaction before yielding back to the ZIO
 * Runtime.
 *   - Use `retryUntil` instead if you don't need to maintain transaction
 *     state for repeats.
 *   - Ensure repeating the STM effect will eventually satisfy the predicate.
 *   - Consider using the Blocking thread pool for execution of the
 *     transaction.
 *
 * @tsplus static ets/STM/Aspects repeatUntil
 */
export const repeatUntil = Pipeable(repeatUntil_)
