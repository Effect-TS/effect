import type { LinkedListNode, TypeId } from "./impl/MutableList.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/MutableList.js"
export * from "./internal/Jumpers/MutableList.js"

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
