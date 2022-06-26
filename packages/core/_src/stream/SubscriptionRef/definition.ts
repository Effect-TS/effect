import { _A } from "@effect/core/io/Ref/definition"

export const SubscriptionRefSym = Symbol.for("@effect/core/stream/SubscriptionRef")
export type SubscriptionRefSym = typeof SubscriptionRefSym

/**
 * A `SubscriptionRef[A]` is a `Ref` that can be subscribed to in order to
 * receive the current value as well as all changes to the value.
 *
 * @tsplus type ets/SubscriptionRef
 */
export interface SubscriptionRef<A> extends Ref.Synchronized<A> {
  /**
   * Internal Discriminator
   */
  readonly [SubscriptionRefSym]: SubscriptionRefSym

  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  get changes(): Stream.UIO<A>
}

/**
 * @tsplus type ets/SubscriptionRef/Ops
 */
export interface SubscriptionRefOps {
}

export const SubscriptionRef: SubscriptionRefOps = {}
