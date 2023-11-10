/**
 * @since 2.0.0
 */
import type { LinkedListNode, TypeId } from "./impl/MutableList.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/MutableList.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/MutableList.js"

/**
 * @since 2.0.0
 */
export declare namespace MutableList {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MutableList.js"
}
/**
 * @since 2.0.0
 * @category model
 */
export interface MutableList<A> extends Iterable<A>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  head: LinkedListNode<A> | undefined
  /** @internal */
  tail: LinkedListNode<A> | undefined
}
