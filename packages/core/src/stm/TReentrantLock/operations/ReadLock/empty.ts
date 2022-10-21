import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * An empty read lock state, in which no fiber holds any read locks.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops empty
 */
export function empty(): TReentrantLock.ReadLock {
  return new InternalReadLock(HashMap.empty<FiberId, number>())
}
