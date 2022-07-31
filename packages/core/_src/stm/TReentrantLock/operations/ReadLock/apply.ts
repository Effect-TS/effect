import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops apply
 */
export function apply(fiberId: FiberId, count: number): TReentrantLock.ReadLock {
  return count <= 0 ?
    TReentrantLock.ReadLock.empty() :
    new InternalReadLock(HashMap(Tuple(fiberId, count)))
}
