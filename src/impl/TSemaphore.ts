/**
 * @since 2.0.0
 */

import type * as Effect from "./Effect.js"
import * as internal from "./internal/stm/tSemaphore.js"
import type * as Scope from "./Scope.js"
import type * as STM from "./STM.js"
import type * as TRef from "./TRef.js"

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
 * @category models
 */
export interface TSemaphore extends TSemaphore.Proto {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TSemaphore {
  /** @internal */
  readonly permits: TRef.TRef<number>
}

/**
 * @since 2.0.0
 */
export declare namespace TSemaphore {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [TSemaphoreTypeId]: TSemaphoreTypeId
  }
}

/**
 * @since 2.0.0
 * @category mutations
 */
export const acquire: (self: TSemaphore) => STM.STM<never, never, void> = internal.acquire

/**
 * @since 2.0.0
 * @category mutations
 */
export const acquireN: {
  (n: number): (self: TSemaphore) => STM.STM<never, never, void>
  (self: TSemaphore, n: number): STM.STM<never, never, void>
} = internal.acquireN

/**
 * @since 2.0.0
 * @category getters
 */
export const available: (self: TSemaphore) => STM.STM<never, never, number> = internal.available

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (permits: number) => STM.STM<never, never, TSemaphore> = internal.make

/**
 * @since 2.0.0
 * @category mutations
 */
export const release: (self: TSemaphore) => STM.STM<never, never, void> = internal.release

/**
 * @since 2.0.0
 * @category mutations
 */
export const releaseN: {
  (n: number): (self: TSemaphore) => STM.STM<never, never, void>
  (self: TSemaphore, n: number): STM.STM<never, never, void>
} = internal.releaseN

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermit: {
  (semaphore: TSemaphore): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Effect.Effect<R, E, A>, semaphore: TSemaphore): Effect.Effect<R, E, A>
} = internal.withPermit

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermits: {
  (semaphore: TSemaphore, permits: number): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Effect.Effect<R, E, A>, semaphore: TSemaphore, permits: number): Effect.Effect<R, E, A>
} = internal.withPermits

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermitScoped: (self: TSemaphore) => Effect.Effect<Scope.Scope, never, void> = internal.withPermitScoped

/**
 * @since 2.0.0
 * @category mutations
 */
export const withPermitsScoped: {
  (permits: number): (self: TSemaphore) => Effect.Effect<Scope.Scope, never, void>
  (self: TSemaphore, permits: number): Effect.Effect<Scope.Scope, never, void>
} = internal.withPermitsScoped

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: (permits: number) => TSemaphore = internal.unsafeMakeSemaphore
