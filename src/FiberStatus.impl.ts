/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { FiberId } from "./FiberId.js"
import * as internal from "./internal/fiberStatus.js"
import type { RuntimeFlags } from "./RuntimeFlags.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const FiberStatusTypeId: unique symbol = internal.FiberStatusTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type FiberStatusTypeId = typeof FiberStatusTypeId

export * as FiberStatus from "./FiberStatus.js"

declare module "./FiberStatus.js" {
  /**
   * @since 2.0.0
   * @category models
   */
  export type FiberStatus = Done | Running | Suspended
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Done extends Equal {
  readonly _tag: "Done"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Running extends Equal {
  readonly _tag: "Running"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Suspended extends Equal {
  readonly _tag: "Suspended"
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags
  readonly blockingOn: FiberId
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const done: FiberStatus = internal.done

/**
 * @since 2.0.0
 * @category constructors
 */
export const running: (runtimeFlags: RuntimeFlags) => FiberStatus = internal.running

/**
 * @since 2.0.0
 * @category constructors
 */
export const suspended: (runtimeFlags: RuntimeFlags, blockingOn: FiberId) => FiberStatus = internal.suspended

/**
 * Returns `true` if the specified value is a `FiberStatus`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isFiberStatus: (u: unknown) => u is FiberStatus = internal.isFiberStatus

/**
 * Returns `true` if the specified `FiberStatus` is `Done`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isDone: (self: FiberStatus) => self is Done = internal.isDone

/**
 * Returns `true` if the specified `FiberStatus` is `Running`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isRunning: (self: FiberStatus) => self is Running = internal.isRunning

/**
 * Returns `true` if the specified `FiberStatus` is `Suspended`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSuspended: (self: FiberStatus) => self is Suspended = internal.isSuspended
