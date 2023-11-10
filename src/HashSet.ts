/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { TypeId } from "./impl/HashSet.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/HashSet.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/HashSet.js"

/**
 * @since 2.0.0
 */
export declare namespace HashSet {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/HashSet.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface HashSet<A> extends Iterable<A>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}
