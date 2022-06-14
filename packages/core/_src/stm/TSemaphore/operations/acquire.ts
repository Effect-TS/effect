/**
 * Acquires a single permit in transactional context.
 *
 * @tsplus getter ets/TSemaphore acquire
 */
export function acquire(self: TSemaphore): STM<never, never, void> {
  return self.acquireN(1)
}
