import { TReentrantLockSym } from "@effect/core/stm/TReentrantLock/definition"

export class InternalTReentrantLock implements TReentrantLock {
  readonly [TReentrantLockSym]: TReentrantLockSym = TReentrantLockSym

  constructor(readonly data: TRef<TReentrantLock.Lock>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTReentrantLock(
  _: TReentrantLock
): asserts _ is InternalTReentrantLock {
  //
}
