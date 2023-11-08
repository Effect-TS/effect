import type { TArrayTypeId } from "./TArray.impl.js"
import type { TRef } from "./TRef.js"

export * from "./internal/Jumpers/TArray.js"
export * from "./TArray.impl.js"

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
  export type * from "./TArray.impl.js"
}
