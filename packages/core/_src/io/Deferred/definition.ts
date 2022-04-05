export const DeferredSym = Symbol.for("@effect-ts/core/io/Deferred");
export type DeferredSym = typeof DeferredSym;

export const _E = Symbol.for("@effect-ts/core/io/Deferred/E");
export type _E = typeof _E;

export const _A = Symbol.for("@effect-ts/core/io/Deferred/A");
export type _A = typeof _A;

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @tsplus type ets/Deferred
 */
export interface Deferred<E, A> {
  readonly [DeferredSym]: DeferredSym;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
}

/**
 * @tsplus type ets/Deferred/Ops
 */
export interface DeferredOps {
  $: DeferredAspects;
}
export const Deferred: DeferredOps = {
  $: {}
};

/**
 * @tsplus type ets/Deferred/Aspects
 */
export interface DeferredAspects {}
