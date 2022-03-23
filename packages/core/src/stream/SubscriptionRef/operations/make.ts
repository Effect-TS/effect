import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"
import { Hub } from "../../../io/Hub"
import { Managed } from "../../../io/Managed"
import { Synchronized } from "../../../io/Ref/Synchronized"
import { Stream } from "../../Stream"
import { SubscriptionRef } from "../definition"

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @tsplus static ets/SubscriptionRefOps make
 */
export function make<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): UIO<SubscriptionRef<A>> {
  return Effect.Do()
    .bind("ref", () => Synchronized.make(value))
    .bind("hub", () => Hub.unbounded<A>())
    .bindValue("changes", ({ hub, ref }) =>
      Stream.unwrapManaged(
        Managed(
          ref
            .modifyEffect((a) =>
              Effect.succeedNow(a).zipWith(
                hub.subscribe().effect,
                (a, { tuple: [finalizer, queue] }) =>
                  Tuple(Tuple(finalizer, Stream(a) + Stream.fromQueue(queue)), a)
              )
            )
            .uninterruptible()
        )
      )
    )
    .map(
      ({ changes, hub, ref }) =>
        new SubscriptionRef(
          ref.tapInput((a) => hub.publish(a)),
          changes
        )
    )
}
