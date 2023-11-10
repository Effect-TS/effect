/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { TypeId } from "./impl/SortedMap.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

import type { RedBlackTree as RBT } from "./RedBlackTree.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/SortedMap.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/SortedMap.js"

/**
 * @since 2.0.0
 */
export declare namespace SortedMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/SortedMap.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface SortedMap<K, V> extends Iterable<[K, V]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  /** @internal */
  readonly tree: RBT<K, V>
}
