/**
 * Releases a single permit in a transactional context.
 *
 * @tsplus getter effect/core/stm/TSemaphore release
 * @category mutations
 * @since 1.0.0
 */
export function release(self: TSemaphore): STM<never, never, void> {
  return self.releaseN(1)
}
