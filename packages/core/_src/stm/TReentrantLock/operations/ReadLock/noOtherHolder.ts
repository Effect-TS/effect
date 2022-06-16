import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * Determines if there is no other holder of read locks aside from the
 * specified fiber id. If there are no other holders of read locks aside
 * from the specified fiber id, then it is safe to upgrade the read lock
 * into a write lock.
 *
 * @tsplus fluent ets/TReentrantLock/ReadLock noOtherHolder
 */
export function noOtherHolder_(self: TReentrantLock.ReadLock, fiberId: FiberId): boolean {
  concreteReadLock(self)
  return self.readers.isEmpty || (self.readers.size === 1 && self.readers.has(fiberId))
}

/**
 * Determines if there is no other holder of read locks aside from the
 * specified fiber id. If there are no other holders of read locks aside
 * from the specified fiber id, then it is safe to upgrade the read lock
 * into a write lock.
 *
 * @tsplus static ets/TReentrantLock/ReadLock/Aspects noOtherHolder
 */
export const noOtherHolder = Pipeable(noOtherHolder_)
