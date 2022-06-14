/**
 * Releases a single permit in a transactional context.
 *
 * @tsplus getter ets/TSemaphore release
 */
export function release(self: TSemaphore): STM<never, never, void> {
  return self.releaseN(1)
}
