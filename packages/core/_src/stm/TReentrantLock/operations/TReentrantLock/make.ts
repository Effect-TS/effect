import { InternalTReentrantLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalTReentrantLock"

/**
 * @tsplus static ets/TReentrantLock/Ops __call
 * @tsplus static ets/TReentrantLock/Ops make
 */
export function make(): USTM<TReentrantLock> {
  return TRef.make<TReentrantLock.Lock>(TReentrantLock.ReadLock.empty()).map((_) => new InternalTReentrantLock(_))
}
