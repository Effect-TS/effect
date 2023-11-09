import type { TMapTypeId } from "../TMap.js"
import type { Chunk } from "./Chunk.js"
import type { TArray } from "./TArray.js"
import type { TRef } from "./TRef.js"

export * from "../internal/Jumpers/TMap.js"
export * from "../TMap.js"

/**
 * Transactional map implemented on top of `TRef` and `TArray`. Resolves
 * conflicts via chaining.
 *
 * @since 2.0.0
 * @category models
 */
export interface TMap<K, V> extends TMap.Variance<K, V> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TMap<K, V> {
  /** @internal */
  readonly tBuckets: TRef<TArray<Chunk<readonly [K, V]>>>
  /** @internal */
  readonly tSize: TRef<number>
}

/**
 * @since 2.0.0
 */

export declare namespace TMap {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<K, V> {
    readonly [TMapTypeId]: {
      readonly _K: (_: never) => K
      readonly _V: (_: never) => V
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../TMap.js"
}
