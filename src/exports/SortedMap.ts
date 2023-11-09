import type { TypeId } from "../SortedMap.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

import type { RedBlackTree as RBT } from "./RedBlackTree.js"

export * from "../internal/Jumpers/SortedMap.js"
export * from "../SortedMap.js"

export declare namespace SortedMap {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../SortedMap.js"
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
