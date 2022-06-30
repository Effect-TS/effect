import { ReadLockSym } from "@effect/core/stm/TReentrantLock/definition/ReadLock"

export class InternalReadLock implements TReentrantLock.ReadLock {
  readonly [ReadLockSym]: ReadLockSym = ReadLockSym

  constructor(readonly readers: HashMap<FiberId, number>) {}

  readonly writeLocks = 0

  writeLocksHeld(_fiberId: FiberId): number {
    return 0
  }

  get readLocks(): number {
    return Chunk.from(this.readers.values).reduce(0, (s, a) => s + a)
  }

  readLocksHeld(fiberId: FiberId): number {
    return this.readers.get(fiberId).getOrElse(0)
  }
}

/**
 * @tsplus macro remove
 */
export function concreteReadLock(
  _: TReentrantLock.ReadLock
): asserts _ is InternalReadLock {
  //
}
