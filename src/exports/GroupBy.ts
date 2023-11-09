import type { GroupByTypeId } from "../GroupBy.js"
import type { Pipeable } from "./Pipeable.js"
import type { Queue } from "./Queue.js"
import type { Stream } from "./Stream.js"
import type { Take } from "./Take.js"

export * from "../GroupBy.js"
export * from "../internal/Jumpers/GroupBy.js"

export declare namespace GroupBy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../GroupBy.js"
}
/**
 * Representation of a grouped stream. This allows to filter which groups will
 * be processed. Once this is applied all groups will be processed in parallel
 * and the results will be merged in arbitrary order.
 *
 * @since 2.0.0
 * @category models
 */
export interface GroupBy<R, E, K, V> extends GroupBy.Variance<R, E, K, V>, Pipeable {
  readonly grouped: Stream<R, E, readonly [K, Queue.Dequeue<Take<E, V>>]>
}

/**
 * @since 2.0.0
 */
export declare namespace GroupBy {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<R, E, K, V> {
    readonly [GroupByTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
      readonly _K: (_: never) => K
      readonly _V: (_: never) => V
    }
  }
}
