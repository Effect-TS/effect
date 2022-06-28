import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops empty
 */
export function empty(): TReentrantLock.ReadLock {
  return new InternalReadLock(HashMap.empty<FiberId, number>())
}
