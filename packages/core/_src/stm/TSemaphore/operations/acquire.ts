/**
 * Acquires a single permit in transactional context.
 *
 * @tsplus fluent ets/TSemaphore acquire
 */
export function acquire(self: TSemaphore): STM<never, never, void> {
  return self.acquireN(1)
}
