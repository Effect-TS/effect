/**
 * @since 2.0.0
 */
import type { nonEmpty } from "./impl/NonEmptyIterable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/NonEmptyIterable.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/NonEmptyIterable.js"

/**
 * @since 2.0.0
 */
export declare namespace NonEmptyIterable {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/NonEmptyIterable.js"
}
/**
 * @category model
 * @since 2.0.0
 */
export interface NonEmptyIterable<A> extends Iterable<A> {
  readonly [nonEmpty]: A
}
