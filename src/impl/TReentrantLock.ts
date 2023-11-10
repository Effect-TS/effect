/**
 * @since 2.0.0
 */
import type { Effect } from "../Effect.js"
import * as internal from "../internal/stm/tReentrantLock.js"
import type { Scope } from "../Scope.js"
import type { STM } from "../STM.js"

import type { TReentrantLock } from "../TReentrantLock.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TReentrantLockTypeId: unique symbol = internal.TReentrantLockTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TReentrantLockTypeId = typeof TReentrantLockTypeId

/**
 * Acquires a read lock. The transaction will suspend until no other fiber is
 * holding a write lock. Succeeds with the number of read locks held by this
 * fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const acquireRead: (self: TReentrantLock) => STM<never, never, number> = internal.acquireRead

/**
 * Acquires a write lock. The transaction will suspend until no other fibers
 * are holding read or write locks. Succeeds with the number of write locks
 * held by this fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const acquireWrite: (self: TReentrantLock) => STM<never, never, number> = internal.acquireWrite

/**
 * Retrieves the number of acquired read locks for this fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const fiberReadLocks: (self: TReentrantLock) => STM<never, never, number> = internal.fiberReadLocks

/**
 * Retrieves the number of acquired write locks for this fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const fiberWriteLocks: (self: TReentrantLock) => STM<never, never, number> = internal.fiberWriteLocks

/**
 * Just a convenience method for applications that only need reentrant locks,
 * without needing a distinction between readers / writers.
 *
 * See `TReentrantLock.writeLock`.
 *
 * @since 2.0.0
 * @category mutations
 */
export const lock: (self: TReentrantLock) => Effect<Scope, never, number> = internal.lock

/**
 * Determines if any fiber has a read or write lock.
 *
 * @since 2.0.0
 * @category mutations
 */
export const locked: (self: TReentrantLock) => STM<never, never, boolean> = internal.locked

/**
 * Makes a new reentrant read/write lock.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: STM<never, never, TReentrantLock> = internal.make

/**
 * Obtains a read lock in a scoped context.
 *
 * @since 2.0.0
 * @category mutations
 */
export const readLock: (self: TReentrantLock) => Effect<Scope, never, number> = internal.readLock

/**
 * Retrieves the total number of acquired read locks.
 *
 * @since 2.0.0
 * @category mutations
 */
export const readLocks: (self: TReentrantLock) => STM<never, never, number> = internal.readLocks

/**
 * Determines if any fiber has a read lock.
 *
 * @since 2.0.0
 * @category mutations
 */
export const readLocked: (self: TReentrantLock) => STM<never, never, boolean> = internal.readLocked

/**
 * Releases a read lock held by this fiber. Succeeds with the outstanding
 * number of read locks held by this fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const releaseRead: (self: TReentrantLock) => STM<never, never, number> = internal.releaseRead

/**
 * Releases a write lock held by this fiber. Succeeds with the outstanding
 * number of write locks held by this fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const releaseWrite: (self: TReentrantLock) => STM<never, never, number> = internal.releaseWrite

/**
 * Runs the specified workflow with a lock.
 *
 * @since 2.0.0
 * @category mutations
 */
export const withLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, self: TReentrantLock): Effect<R, E, A>
} = internal.withLock

/**
 * Runs the specified workflow with a read lock.
 *
 * @since 2.0.0
 * @category mutations
 */
export const withReadLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, self: TReentrantLock): Effect<R, E, A>
} = internal.withReadLock

/**
 * Runs the specified workflow with a write lock.
 *
 * @since 2.0.0
 * @category mutations
 */
export const withWriteLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, self: TReentrantLock): Effect<R, E, A>
} = internal.withWriteLock

/**
 * Obtains a write lock in a scoped context.
 *
 * @since 2.0.0
 * @category mutations
 */
export const writeLock: (self: TReentrantLock) => Effect<Scope, never, number> = internal.writeLock

/**
 * Determines if a write lock is held by some fiber.
 *
 * @since 2.0.0
 * @category mutations
 */
export const writeLocked: (self: TReentrantLock) => STM<never, never, boolean> = internal.writeLocked

/**
 * Computes the number of write locks held by fibers.
 *
 * @since 2.0.0
 * @category mutations
 */
export const writeLocks: (self: TReentrantLock) => STM<never, never, number> = internal.writeLocks
