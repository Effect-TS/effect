import type { TypeId } from "../SortedSet.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"
import type { RedBlackTree as RBT } from "./RedBlackTree.js"

export * from "../internal/Jumpers/SortedSet.js"
export * from "../SortedSet.js"

export declare namespace SortedSet {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../SortedSet.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface SortedSet<A> extends Iterable<A>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
  }
  /** @internal */
  readonly keyTree: RBT<A, boolean>
}
