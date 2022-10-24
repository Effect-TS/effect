import { _A } from "@effect/core/io/Ref/definition"

/**
 * @category symbol
 * @since 1.0.0
 */
export const SubscriptionRefSym = Symbol.for("@effect/core/stream/SubscriptionRef")

/**
 * @category symbol
 * @since 1.0.0
 */
export type SubscriptionRefSym = typeof SubscriptionRefSym

/**
 * A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
 * receive the current value as well as all changes to the value.
 *
 * @tsplus type effect/core/stream/SubscriptionRef
 * @category model
 * @since 1.0.0
 */
export interface SubscriptionRef<A> extends Ref.Synchronized<A> {
  /**
   * Internal Discriminator
   */
  get [SubscriptionRefSym](): SubscriptionRefSym

  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  get changes(): Stream.UIO<A>
}

/**
 * @tsplus type effect/core/stream/SubscriptionRef.Ops
 * @category model
 * @since 1.0.0
 */
export interface SubscriptionRefOps {}

export const SubscriptionRef: SubscriptionRefOps = {}
