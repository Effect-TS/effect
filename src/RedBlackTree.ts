import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"
import type { TypeId } from "./RedBlackTree.impl.js"

export * from "./internal/Jumpers/RedBlackTree.js"
export * from "./RedBlackTree.impl.js"

export declare namespace RedBlackTree {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./RedBlackTree.impl.js"
}
/**
 * A Red-Black Tree.
 *
 * @since 2.0.0
 * @category models
 */
export interface RedBlackTree<Key, Value> extends Iterable<readonly [Key, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}

/**
 * @since 2.0.0
 */
export declare namespace RedBlackTree {
  /**
   * @since 2.0.0
   */
  export type Direction = number & {
    readonly Direction: unique symbol
  }
}
