import type { FiberRefsSym } from "../FiberRefs.js"
import type { FiberId } from "./FiberId.js"
import type { FiberRef } from "./FiberRef.js"
import type { Pipeable } from "./Pipeable.js"
import type { ReadonlyArray as Arr } from "./ReadonlyArray.js"

export * from "../FiberRefs.js"
export * from "../internal/Jumpers/FiberRefs.js"

export declare namespace FiberRefs {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../FiberRefs.js"
}
/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 *
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @since 2.0.0
 * @category models
 */
export interface FiberRefs extends Pipeable {
  readonly [FiberRefsSym]: FiberRefsSym
  readonly locals: Map<FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>>
}
