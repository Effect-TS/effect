import { WriteLockSym } from "@effect/core/stm/TReentrantLock/definition/WriteLock"
import * as Equal from "@fp-ts/data/Equal"

/** @internal */
export class InternalWriteLock implements TReentrantLock.WriteLock {
  readonly [WriteLockSym]: WriteLockSym = WriteLockSym

  constructor(readonly writeLocks: number, readonly readLocks: number, readonly fiberId: FiberId) {}

  writeLocksHeld(fiberId: FiberId): number {
    return Equal.equals(this.fiberId, fiberId) ? this.writeLocks : 0
  }

  readLocksHeld(fiberId: FiberId): number {
    return Equal.equals(this.fiberId, fiberId) ? this.readLocks : 0
  }
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteWriteLock(
  _: TReentrantLock.WriteLock
): asserts _ is InternalWriteLock {
  //
}
