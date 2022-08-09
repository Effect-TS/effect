import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * Creates a new read lock where the specified fiber holds the specified
 * number of read locks.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops __call
 */
export function make(
  readers: HashMap<FiberId, number>
): TReentrantLock.ReadLock {
  return new InternalReadLock(readers)
}
