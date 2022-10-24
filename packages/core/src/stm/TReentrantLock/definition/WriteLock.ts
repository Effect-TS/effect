import type { Lock } from "@effect/core/stm/TReentrantLock/definition/Lock"
/**
 * @category symbol
 * @since 1.0.0
 */
export const WriteLockSym = Symbol.for("@effect/core/stm/TReentrantLock/WriteLock")

/**
 * @category symbol
 * @since 1.0.0
 */
export type WriteLockSym = typeof WriteLockSym

/**
 * This data structure describes the state of the lock when a single fiber has
 * a write lock. The fiber has an identity, and may also have acquired a
 * certain number of read locks.
 *
 * @tsplus type effect/core/stm/TReentrantLock/WriteLock
 * @category model
 * @since 1.0.0
 */
export interface WriteLock extends Lock {}

/**
 * @tsplus type effect/core/stm/TReentrantLock/WriteLock.Ops
 * @category model
 * @since 1.0.0
 */
export interface WriteLockOps {
  $: WriteLockAspects
}
export const WriteLockOps: WriteLockOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TReentrantLock/WriteLock.Aspects
 * @category model
 * @since 1.0.0
 */
export interface WriteLockAspects {}
