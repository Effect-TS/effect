/**
 * Constructs a new `TSemaphore` with the specified number of permits,
 * immediately committing the transaction.
 *
 * @tsplus static effect/core/stm/TSemaphore.Ops makeCommit
 * @category constructors
 * @since 1.0.0
 */
export function makeCommit(permits: number): Effect<never, never, TSemaphore> {
  return TSemaphore.make(permits).commit
}
