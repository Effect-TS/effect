import { ReadLockSym } from "@effect/core/stm/TReentrantLock/definition/ReadLock"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as Option from "@fp-ts/data/Option"

/** @internal */
export class InternalReadLock implements TReentrantLock.ReadLock {
  readonly [ReadLockSym]: ReadLockSym = ReadLockSym

  constructor(readonly readers: HashMap.HashMap<FiberId, number>) {}

  readonly writeLocks = 0

  writeLocksHeld(_fiberId: FiberId): number {
    return 0
  }

  get readLocks(): number {
    return Array.from(HashMap.values(this.readers)).reduce((s, a) => s + a, 0)
  }

  readLocksHeld(fiberId: FiberId): number {
    return pipe(this.readers, HashMap.get(fiberId), Option.getOrElse(0))
  }
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteReadLock(
  _: TReentrantLock.ReadLock
): asserts _ is InternalReadLock {
  //
}
