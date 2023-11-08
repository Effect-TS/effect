import type { Effect } from "./Effect.js"
import type { Pipeable } from "./Pipeable.js"
import type { RefTypeId } from "./Ref.impl.js"

export * from "./internal/Jumpers/Ref.js"
export * from "./Ref.impl.js"

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
  export type * from "./Ref.impl.js"
}
