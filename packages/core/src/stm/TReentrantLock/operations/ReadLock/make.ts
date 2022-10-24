import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import type { HashMap } from "@fp-ts/data/HashMap"

/**
 * Creates a new read lock where the specified fiber holds the specified
 * number of read locks.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make(
  readers: HashMap<FiberId, number>
): TReentrantLock.ReadLock {
  return new InternalReadLock(readers)
}
