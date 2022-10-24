/**
 * @tsplus type effect/core/stm/TReentrantLock/Lock
 * @category model
 * @since 1.0.0
 */
export interface Lock {
  readonly readLocks: number
  readLocksHeld(fiberId: FiberId): number
  readonly writeLocks: number
  writeLocksHeld(fiberId: FiberId): number
}
