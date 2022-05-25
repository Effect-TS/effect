/**
 * Releases a single permit in a transactional context.
 *
 * @tsplus fluent ets/TSemaphore release
 */
export function release(self: TSemaphore): STM<unknown, never, void> {
  return self.releaseN(1)
}
