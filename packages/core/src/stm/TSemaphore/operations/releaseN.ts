import { concreteTSemaphore } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal"

/**
 * Releases the specified number of permits in a transactional context
 *
 * @tsplus static effect/core/stm/TSemaphore.Aspects releaseN
 * @tsplus pipeable effect/core/stm/TSemaphore releaseN
 * @category mutations
 * @since 1.0.0
 */
export function releaseN(n: number) {
  return (self: TSemaphore): STM<never, never, void> => {
    concreteTSemaphore(self)
    return STM.Effect((journal) => {
      if (n < 0) {
        throw new IllegalArgumentException(
          `Unexpected negative value ${n} passed to releaseN`
        )
      }
      const current = self.permits.unsafeGet(journal)
      return self.permits.unsafeSet(current + n, journal)
    })
  }
}
