import {
  SubscriptionRefInternal
} from "@effect/core/stream/SubscriptionRef/operations/_internal/SubscriptionRefInternal"

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @tsplus static effect/core/stream/SubscriptionRef.Ops make
 * @tsplus static effect/core/stream/SubscriptionRef.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(
  value: LazyArg<A>
): Effect<never, never, SubscriptionRef<A>> {
  return Effect.suspendSucceed(
    Do(($) => {
      const ref = $(Ref.make(value))
      const hub = $(Hub.unbounded<A>())
      const sem = $(TSemaphore.makeCommit(1))
      return new SubscriptionRefInternal(ref, hub, sem)
    })
  )
}
