import type { DeferredInternal } from "@effect/core/io/Fiber/_internal/runtime"

export const DeferredSym = Symbol.for("@effect/core/io/Deferred")
export type DeferredSym = typeof DeferredSym

export const _E = Symbol.for("@effect/core/io/Deferred/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/io/Deferred/A")
export type _A = typeof _A

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @tsplus type effect/core/io/Deferred
 */
export interface Deferred<E, A> extends DeferredInternal<E, A> {}

/**
 * @tsplus type effect/core/io/Deferred.Aspects
 */
export interface DeferredAspects {}

/**
 * @tsplus type effect/core/io/Deferred.Ops
 */
export interface DeferredOps {
  readonly $: DeferredAspects
}

export const Deferred: DeferredOps = {
  $: {}
}
