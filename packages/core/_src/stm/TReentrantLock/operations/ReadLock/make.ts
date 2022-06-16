import { InternalReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * @tsplus static ets/TReentrantLock/ReadLock/Ops __call
 */
export function make(
  readers: HashMap<FiberId, number>
): TReentrantLock.ReadLock {
  return new InternalReadLock(readers)
}
