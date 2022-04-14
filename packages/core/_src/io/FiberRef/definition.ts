export const FiberRefSym = Symbol.for("@effect/core/io/FiberRef");
export type FiberRefSym = typeof FiberRefSym;

export const _Value = Symbol.for("@effect/core/io/FiberRef/Value");
export type _Value = typeof _Value;

export const _Patch = Symbol.for("@effect/core/io/FiberRef/Patch");
export type _Patch = typeof _Patch;

/**
 * A `FiberRef` is Effect-TS's equivalent of Java's `ThreadLocal`. The value of a
 * `FiberRef` is automatically propagated to child fibers when they are forked
 * and merged back in to the value of the parent fiber after they are joined.
 *
 * By default the value of the child fiber will replace the value of the parent
 * fiber on join but you can specify your own logic for how values should be
 * merged.
 *
 * @tsplus type ets/FiberRef
 */
export interface FiberRef<Value, Patch> {
  readonly [FiberRefSym]: FiberRefSym;
  /**
   * The type of the value of the `FiberRef`.
   */
  readonly [_Value]: () => Value;
  /**
   * The type of the patch that describes updates to the value of the
   * `FiberRef`. In the simple case this will just be a function that sets the
   * value of the `FiberRef`. In more complex cases this will describe an update
   * to a piece of a whole value, allowing updates to the value by different
   * fibers to be combined in a compositional way when those fibers are joined.
   */
  readonly [_Patch]: Patch;
}

/**
 * @tsplus type ets/FiberRef/Ops
 */
export interface FiberRefOps {
  $: FiberRefAspects;
}
export const FiberRef: FiberRefOps = {
  $: {}
};

/**
 * @tsplus type ets/FiberRef/Aspects
 */
export interface FiberRefAspects {}
