import type { SynchronizedRefTypeId } from "../SynchronizedRef.js"
import type { Effect } from "./Effect.js"
import type { Ref } from "./Ref.js"

export * from "../internal/Jumpers/SynchronizedRef.js"
export * from "../SynchronizedRef.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface SynchronizedRef<A> extends SynchronizedRef.Variance<A>, Ref<A> {
  modifyEffect<R, E, B>(f: (a: A) => Effect<R, E, readonly [B, A]>): Effect<R, E, B>
}

/**
 * @since 2.0.0
 */
export declare namespace SynchronizedRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [SynchronizedRefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../SynchronizedRef.js"
}
