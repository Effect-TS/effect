/**
 * @since 2.0.0
 */
import type { TSetTypeId } from "./impl/TSet.js"
import type { TMap } from "./TMap.js"

/**
 * @since 2.0.0
 */
export * from "./impl/TSet.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/TSet.js"

/**
 * Transactional set implemented on top of `TMap`.
 *
 * @since 2.0.0
 * @category models
 */
export interface TSet<A> extends TSet.Variance<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TSet<A> {
  /** @internal */
  readonly tMap: TMap<A, void>
}

/**
 * @since 2.0.0
 */
export declare namespace TSet {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TSetTypeId]: {
      readonly _A: (_: never) => A
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TSet.js"
}
