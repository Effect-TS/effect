import type { Lock } from "@effect/core/stm/TReentrantLock/definition/Lock"

export const WriteLockSym = Symbol.for("@effect/core/stm/TReentrantLock/WriteLock")
export type WriteLockSym = typeof WriteLockSym

/**
 * This data structure describes the state of the lock when a single fiber has
 * a write lock. The fiber has an identity, and may also have acquired a
 * certain number of read locks.
 *
 * @tsplus type ets/TReentrantLock/WriteLock
 */
export interface WriteLock extends Lock {}

/**
 * @tsplus type ets/TReentrantLock/WriteLock/Ops
 */
export interface WriteLockOps {
  $: WriteLockAspects
}
export const WriteLockOps: WriteLockOps = {
  $: {}
}

/**
 * @tsplus type ets/TReentrantLock/WriteLock/Aspects
 */
export interface WriteLockAspects {}
