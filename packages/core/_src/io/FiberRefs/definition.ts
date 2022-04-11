export const FiberRefsSym = Symbol.for("@effect/core/io/FiberRefs");
export type FiberRefsSym = typeof FiberRefsSym;

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @tsplus type ets/FiberRefs
 */
export interface FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym;
}

/**
 * @tsplus type ets/FiberRefs/Ops
 */
export interface FiberRefsOps {
  $: FiberRefsAspects;
}
export const FiberRefs: FiberRefsOps = {
  $: {}
};

/**
 * @tsplus type ets/FiberRefs/Aspects
 */
export interface FiberRefsAspects {}

// /**
//  * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
//  * This allows safely propagating `FiberRef` values across fiber boundaries, for
//  * example between an asynchronous producer and consumer.
//  */
// export class FiberRefs {
//   #fiberRefLocals: Map<FiberRef<unknown>, unknown>;

//   constructor(fiberRefLocals: Map<FiberRef<unknown>, unknown>) {
//     this.#fiberRefLocals = fiberRefLocals;
//   }

//   /**
//    * Returns a set of each `FiberRef` in this collection.
//    */
//   get fiberRefs(): ReadonlySet<FiberRef<unknown>> {
//     return new Set(this.#fiberRefLocals.keys());
//   }

//   /**
//    * Sets the value of each `FiberRef` for the fiber running this effect to the
//    * value in this collection of `FiberRef` values.
//    */
//   get setAll(): UIO<void> {
//     return Effect.forEachDiscard(this.fiberRefs, (fiberRef) => fiberRef.set(this.getOrDefault(fiberRef)));
//   }

//   /**
//    * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
//    * values if it exists or `None` otherwise.
//    */
//   get<A>(fiberRef: FiberRef<A>): Option<A> {
//     return Option.fromNullable(this.#fiberRefLocals.get(fiberRef)) as Option<A>;
//   }

//   /**
//    * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
//    * values if it exists or the `initial` value of the `FiberRef` otherwise.
//    */
//   getOrDefault<A>(fiberRef: FiberRef<A>): A {
//     return this.get(fiberRef).getOrElse(fiberRef.initialValue());
//   }
// }

// /**
//  * Returns a collection of all `FiberRef` values for the fiber running this
//  * effect.
//  *
//  * @tsplus static ets/Effect/Ops getFiberRefs
//  */
// export const getFiberRefs: UIO<FiberRefs> = new IFiberRefGetAll((fiberRefLocals) =>
//   Effect.succeedNow(new FiberRefs(fiberRefLocals))
// );

// /**
//  * Sets the `FiberRef` values for the fiber running this effect to the values
//  * in the specified collection of `FiberRef` values.
//  *
//  * @tsplus static ets/Effect/Ops setFiberRefs
//  */
// export function setFiberRefs(fiberRefs: FiberRefs, __tsplusTrace?: string): UIO<void> {
//   return Effect.suspendSucceed(fiberRefs.setAll);
// }
