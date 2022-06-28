import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * Determines if there is no other holder of read locks aside from the
 * specified fiber id. If there are no other holders of read locks aside
 * from the specified fiber id, then it is safe to upgrade the read lock
 * into a write lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Aspects noOtherHolder
 * @tsplus pipeable effect/core/stm/TReentrantLock/ReadLock noOtherHolder
 */
export function noOtherHolder(fiberId: FiberId) {
  return (self: TReentrantLock.ReadLock): boolean => {
    concreteReadLock(self)
    return self.readers.isEmpty || (self.readers.size === 1 && self.readers.has(fiberId))
  }
}
