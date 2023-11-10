/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { RefTypeId } from "./impl/Ref.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Ref.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Ref.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface Ref<A> extends Ref.Variance<A>, Pipeable {
  modify<B>(f: (a: A) => readonly [B, A]): Effect<never, never, B>
}

/**
 * @since 2.0.0
 * @category models

 * @since 2.0.0
 */
export declare namespace Ref {
  /**
   * @since 2.0.0
   */
  export interface Variance<A> {
    readonly [RefTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Ref.js"
}
