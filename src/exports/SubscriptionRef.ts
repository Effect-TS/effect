import type { SubscriptionRefTypeId } from "../SubscriptionRef.js"
import type { Effect } from "./Effect.js"
import type { Pipeable } from "./Pipeable.js"
import type { PubSub } from "./PubSub.js"
import type { Ref } from "./Ref.js"
import type { Stream } from "./Stream.js"
import type { SynchronizedRef } from "./SynchronizedRef.js"

export * from "../internal/Jumpers/SubscriptionRef.js"
export * from "../SubscriptionRef.js"

/**
 * A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
 * receive the current value as well as all changes to the value.
 *
 * @since 2.0.0
 * @category models
 */
export interface SubscriptionRef<A> extends SubscriptionRef.Variance<A>, SynchronizedRef<A>, Pipeable {
  /** @internal */
  readonly ref: Ref<A>
  /** @internal */
  readonly pubsub: PubSub<A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  readonly changes: Stream<never, never, A>
}

/**
 * @since 2.0.0
 */
export declare namespace SubscriptionRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [SubscriptionRefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../SubscriptionRef.js"
}
