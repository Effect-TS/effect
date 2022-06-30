/**
 * @tsplus type effect/core/stm/TReentrantLock/Lock
 */
export interface Lock {
  readonly readLocks: number
  readLocksHeld(fiberId: FiberId): number
  readonly writeLocks: number
  writeLocksHeld(fiberId: FiberId): number
}
