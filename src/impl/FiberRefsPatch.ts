/**
 * @since 2.0.0
 */
import type { FiberId } from "../FiberId.js"
import type { FiberRef } from "../FiberRef.js"
import type { FiberRefs } from "../FiberRefs.js"
import * as internal from "../internal/fiberRefs/patch.js"

import type { FiberRefsPatch } from "../FiberRefsPatch.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Add {
  readonly _tag: "Add"
  readonly fiberRef: FiberRef<unknown>
  readonly value: unknown
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Remove {
  readonly _tag: "Remove"
  readonly fiberRef: FiberRef<unknown>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Update {
  readonly _tag: "Update"
  readonly fiberRef: FiberRef<unknown>
  readonly patch: unknown
}

/**
 * @since 2.0.0
 * @category models
 */
export interface AndThen {
  readonly _tag: "AndThen"
  readonly first: FiberRefsPatch
  readonly second: FiberRefsPatch
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty: FiberRefsPatch = internal.empty

/**
 * Constructs a patch that describes the changes between the specified
 * collections of `FiberRef`
 *
 * @since 2.0.0
 * @category constructors
 */
export const diff: (oldValue: FiberRefs, newValue: FiberRefs) => FiberRefsPatch = internal.diff

/**
 * Combines this patch and the specified patch to create a new patch that
 * describes applying the changes from this patch and the specified patch
 * sequentially.
 *
 * @since 2.0.0
 * @category constructors
 */
export const combine: {
  (that: FiberRefsPatch): (self: FiberRefsPatch) => FiberRefsPatch
  (self: FiberRefsPatch, that: FiberRefsPatch): FiberRefsPatch
} = internal.combine

/**
 * Applies the changes described by this patch to the specified collection
 * of `FiberRef` values.
 *
 * @since 2.0.0
 * @category destructors
 */
export const patch: {
  (fiberId: FiberId.Runtime, oldValue: FiberRefs): (self: FiberRefsPatch) => FiberRefs
  (self: FiberRefsPatch, fiberId: FiberId.Runtime, oldValue: FiberRefs): FiberRefs
} = internal.patch
