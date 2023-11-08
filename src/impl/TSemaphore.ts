/**
 * @since 2.0.0
 */

import type { Effect } from "../Effect.js"
import * as internal from "../internal/stm/tSemaphore.js"
import type { Scope } from "../Scope.js"
import type { STM } from "../STM.js"

import type { TSemaphore } from "../TSemaphore.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TSemaphoreTypeId: unique symbol = internal.TSemaphoreTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TSemaphoreTypeId = typeof TSemaphoreTypeId

/**
 * @since 2.0.0
 * @category mutations
 */
export const acquire: (self: TSemaphore) => STM<never, never, void> = internal.acquire

/**
 * @since 2.0.0
 * @category mutations
 */
export const acquireN: {
  (n: number): (self: TSemaphore) => STM<never, never, void>
  (self: TSemaphore, n: number): STM<never, never, void>
} = internal.acquireN

/**
 * @since 2.0.0
 * @category getters
 */
export const available: (self: TSemaphore) => STM<never, never, number> = internal.available

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (permits: number) => STM<never, never, TSemaphore> = internal.make

/**
 * @since 2.0.0
 * @category mutations
 */
export const release: (self: TSemaphore) => STM<never, never, void> = internal.release

/**
 * @since 2.0.0
 * @category mutations
 */
export const releaseN: {
  (n: number): (self: TSemaphore) => STM<never, never, void>
  (self: TSemaphore, n: number): STM<never, never, void>
} = internal.releaseN

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermit: {
  (semaphore: TSemaphore): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, semaphore: TSemaphore): Effect<R, E, A>
} = internal.withPermit

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermits: {
  (semaphore: TSemaphore, permits: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, semaphore: TSemaphore, permits: number): Effect<R, E, A>
} = internal.withPermits

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermitScoped: (self: TSemaphore) => Effect<Scope, never, void> = internal.withPermitScoped

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermitsScoped: {
  (permits: number): (self: TSemaphore) => Effect<Scope, never, void>
  (self: TSemaphore, permits: number): Effect<Scope, never, void>
} = internal.withPermitsScoped

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: (permits: number) => TSemaphore = internal.unsafeMakeSemaphore
