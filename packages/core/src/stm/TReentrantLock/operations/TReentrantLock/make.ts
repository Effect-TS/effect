import { InternalTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * Makes a new reentrant read/write lock.
 *
 * @tsplus static effect/core/stm/TReentrantLock.Ops __call
 * @tsplus static effect/core/stm/TReentrantLock.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make(): USTM<TReentrantLock> {
  return TRef.make<TReentrantLock.Lock>(TReentrantLock.ReadLock.empty()).map((_) =>
    new InternalTReentrantLock(_)
  )
}
