import {
  SubscriptionRefInternal
} from "@effect/core/stream/SubscriptionRef/operations/_internal/SubscriptionRefInternal"

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @tsplus static effect/core/stream/SubscriptionRef.Ops make
 * @tsplus static effect/core/stream/SubscriptionRef.Ops __call
 */
export function make<A>(
  value: LazyArg<A>
): Effect<never, never, SubscriptionRef<A>> {
  return Effect.suspendSucceed(
    Effect.struct({
      ref: Ref.Synchronized.make(value),
      hub: Hub.unbounded<A>()
    }).map(({ hub, ref }) =>
      Object.setPrototypeOf({
        ref,
        hub
      }, SubscriptionRefInternal)
    )
  )
}
