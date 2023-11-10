/**
 * @since 2.0.0
 */
import type { EmptyMutableQueue, TypeId } from "./impl/MutableQueue.js"
import type { Inspectable } from "./Inspectable.js"
import type { MutableList } from "./MutableList.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/MutableQueue.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/MutableQueue.js"

/**
 * @since 2.0.0
 */
export declare namespace MutableQueue {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MutableQueue.js"
}
/**
 * @since 2.0.0
 * @category model
 */
export interface MutableQueue<A> extends Iterable<A>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  queue: MutableList<A>
  /** @internal */
  capacity: number | undefined
}

/**
 * @since 2.0.0
 */
export declare namespace MutableQueue {
  /**
   * @since 2.0.0
   */
  export type Empty = typeof EmptyMutableQueue
}
