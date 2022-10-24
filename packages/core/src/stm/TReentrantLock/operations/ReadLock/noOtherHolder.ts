import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"

/**
 * Determines if there is no other holder of read locks aside from the
 * specified fiber id. If there are no other holders of read locks aside
 * from the specified fiber id, then it is safe to upgrade the read lock
 * into a write lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Aspects noOtherHolder
 * @tsplus pipeable effect/core/stm/TReentrantLock/ReadLock noOtherHolder
 * @category mutations
 * @since 1.0.0
 */
export function noOtherHolder(fiberId: FiberId) {
  return (self: TReentrantLock.ReadLock): boolean => {
    concreteReadLock(self)
    return HashMap.isEmpty(self.readers) ||
      (HashMap.size(self.readers) === 1 &&
        pipe(self.readers, HashMap.has(fiberId)))
  }
}
