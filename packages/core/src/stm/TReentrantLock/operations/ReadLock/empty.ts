import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import * as HashMap from "@fp-ts/data/HashMap"

/**
 * An empty read lock state, in which no fiber holds any read locks.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export function empty(): TReentrantLock.ReadLock {
  return new InternalReadLock(HashMap.empty<FiberId, number>())
}
