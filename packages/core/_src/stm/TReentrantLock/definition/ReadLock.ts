import type { Lock } from "@effect/core/stm/TReentrantLock/definition/Lock"

export const ReadLockSym = Symbol.for("@effect/core/stm/TReentrantLock/ReadLock")
export type ReadLockSym = typeof ReadLockSym

/**
 * This data structure describes the state of the lock when multiple fibers
 * have acquired read locks. The state is tracked as a map from fiber identity
 * to number of read locks acquired by the fiber. This level of detail permits
 * upgrading a read lock to a write lock.
 *
 * @tsplus type effect/core/stm/TReentrantLock/ReadLock
 */
export interface ReadLock extends Lock {}

/**
 * @tsplus type effect/core/stm/TReentrantLock/ReadLock.Ops
 */
export interface ReadLockOps {
  $: ReadLockAspects
}
export const ReadLockOps: ReadLockOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/TReentrantLock/ReadLock.Aspects
 */
export interface ReadLockAspects {}
