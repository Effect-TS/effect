/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { TypeId } from "./impl/RedBlackTree.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/RedBlackTree.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/RedBlackTree.js"

/**
 * @since 2.0.0
 */
export declare namespace RedBlackTree {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/RedBlackTree.js"
}
/**
 * A Red-Black Tree.
 *
 * @since 2.0.0
 * @category models
 */
export interface RedBlackTree<Key, Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
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
