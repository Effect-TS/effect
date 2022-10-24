import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import * as HashMap from "@fp-ts/data/HashMap"

/**
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Ops apply
 * @category mutations
 * @since 1.0.0
 */
export function apply(fiberId: FiberId, count: number): TReentrantLock.ReadLock {
  return count <= 0 ?
    TReentrantLock.ReadLock.empty() :
    new InternalReadLock(HashMap.make([fiberId, count]))
}
