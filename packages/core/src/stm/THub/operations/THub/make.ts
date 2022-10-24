import { InternalTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Creates a hub with the specified strategy.
 *
 * @tsplus static effect/core/stm/THub.Ops make
 * @tsplus static effect/core/stm/THub.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(
  requestedCapacity: number,
  strategy: THub.Strategy
): USTM<THub<A>> {
  return Do(($) => {
    const empty = $(TRef.make<THub.Node<A>>(() => undefined!))
    const hubSize = $(TRef.make(0))
    const publisherHead = $(TRef.make(empty))
    const publisherTail = $(TRef.make(empty))
    const subscriberCount = $(TRef.make(0))
    const subscribers = $(TRef.make(HashSet.empty<TRef<TRef<THub.Node<A>>>>()))

    return new InternalTHub(
      hubSize,
      publisherHead,
      publisherTail,
      requestedCapacity,
      strategy,
      subscriberCount,
      subscribers
    )
  })
}
