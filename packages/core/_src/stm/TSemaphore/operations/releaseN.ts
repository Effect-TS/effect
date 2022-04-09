import { concreteTSemaphore } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal";

/**
 * Releases the specified number of permits in a transactional context
 *
 * @tsplus fluent ets/TSemaphore releaseN
 */
export function releaseN_(self: TSemaphore, n: number): STM<unknown, never, void> {
  concreteTSemaphore(self);
  return STM.Effect((journal) => {
    if (n < 0) {
      throw new IllegalArgumentException(
        `Unexpected negative value ${n} passed to releaseN`
      );
    }
    const current = self.permits.unsafeGet(journal);
    return self.permits.unsafeSet(current + n, journal);
  });
}

/**
 * Releases the specified number of permits in a transactional context
 *
 * @tsplus static ets/TSemaphore/Aspects releaseN
 */
export const releaseN = Pipeable(releaseN_);
