import { InternalWriteLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalWriteLock"

/**
 * @tsplus static ets/TReentrantLock/WriteLock/Ops __call
 */
export function make(
  writeLocks: number,
  readLocks: number,
  fiberId: FiberId
): TReentrantLock.WriteLock {
  return new InternalWriteLock(writeLocks, readLocks, fiberId)
}
