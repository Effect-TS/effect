/**
 * Constructs a new `TSemaphore` with the specified number of permits,
 * immediately committing the transaction.
 *
 * @tsplus static ets/TSemaphore/Ops makeCommit
 */
export function makeCommit(permits: number, __tsplusTrace?: string): Effect.UIO<TSemaphore> {
  return TSemaphore.make(permits).commit();
}
