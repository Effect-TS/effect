import type { nonEmpty } from "./impl/NonEmptyIterable.js"

export * from "./impl/NonEmptyIterable.js"
export * from "./internal/Jumpers/NonEmptyIterable.js"

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
