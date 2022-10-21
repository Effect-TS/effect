import { WriteLockSym } from "@effect/core/stm/TReentrantLock/definition/WriteLock"

export class InternalWriteLock implements TReentrantLock.WriteLock {
  readonly [WriteLockSym]: WriteLockSym = WriteLockSym

  constructor(readonly writeLocks: number, readonly readLocks: number, readonly fiberId: FiberId) {}

  writeLocksHeld(fiberId: FiberId): number {
    return this.fiberId == fiberId ? this.writeLocks : 0
  }

  readLocksHeld(fiberId: FiberId): number {
    return this.fiberId == fiberId ? this.readLocks : 0
  }
}

/**
 * @tsplus macro remove
 */
export function concreteWriteLock(
  _: TReentrantLock.WriteLock
): asserts _ is InternalWriteLock {
  //
}
