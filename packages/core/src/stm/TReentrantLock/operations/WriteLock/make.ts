import { InternalWriteLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalWriteLock"

/**
 * @tsplus static effect/core/stm/TReentrantLock/WriteLock.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make(
  writeLocks: number,
  readLocks: number,
  fiberId: FiberId
): TReentrantLock.WriteLock {
  return new InternalWriteLock(writeLocks, readLocks, fiberId)
}
