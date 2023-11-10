/**
 * @since 2.0.0
 */
import type { TArrayTypeId } from "./impl/TArray.js"
import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/TArray.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/TArray.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface TArray<A> extends TArray.Variance<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TArray<A> {
  /** @internal */
  readonly chunk: Array<TRef<A>>
}

/**
 * @since 2.0.0
 */
export declare namespace TArray {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TArrayTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TArray.js"
}
