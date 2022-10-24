import type { Lock as LockInternal } from "@effect/core/stm/TReentrantLock/definition/Lock"
import type { ReadLock as ReadLockInternal } from "@effect/core/stm/TReentrantLock/definition/ReadLock"
import { ReadLockOps } from "@effect/core/stm/TReentrantLock/definition/ReadLock"
import type { WriteLock as WriteLockInternal } from "@effect/core/stm/TReentrantLock/definition/WriteLock"
import { WriteLockOps } from "@effect/core/stm/TReentrantLock/definition/WriteLock"

/**
 * @category symbol
 * @since 1.0.0
 */
export const TReentrantLockSym = Symbol.for("@effect/core/stm/TReentrantLock")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TReentrantLockSym = typeof TReentrantLockSym

/**
 * @since 1.0.0
 */
export declare namespace TReentrantLock {
  export interface WriteLock extends WriteLockInternal {}
  export interface ReadLock extends ReadLockInternal {}
  export interface Lock extends LockInternal {}
}

/**
 * A `TReentrantLock` is a reentrant read/write lock. Multiple readers may all
 * concurrently acquire read locks. Only one writer is allowed to acquire a
 * write lock at any given time. Read locks may be upgraded into write locks. A
 * fiber that has a write lock may acquire other write locks or read locks.
 *
 * The two primary methods of this structure are `readLock`, which acquires a
 * read lock in a scoped context, and `writeLock`, which acquires a write lock
 * in a scoped context.
 *
 * Although located in the STM package, there is no need for locks within STM
 * transactions. However, this lock can be quite useful in effectful code, to
 * provide consistent read/write access to mutable state; and being in STM
 * allows this structure to be composed into more complicated concurrent
 * structures that are consumed from effectful code.
 *
 * @tsplus type effect/core/stm/TReentrantLock
 * @category model
 * @since 1.0.0
 */
export interface TReentrantLock {}

/**
 * @tsplus type effect/core/stm/TReentrantLock.Ops
 * @category model
 * @since 1.0.0
 */
export interface TReentrantLockOps {
  $: TReentrantLockAspects
  WriteLock: WriteLockOps
  ReadLock: ReadLockOps
}
export const TReentrantLock: TReentrantLockOps = {
  $: {},
  ReadLock: ReadLockOps,
  WriteLock: WriteLockOps
}

/**
 * @tsplus type effect/core/stm/TReentrantLock.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TReentrantLockAspects {}
