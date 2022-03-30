import { Tuple } from "../../collection/immutable/Tuple"
import type { UIO } from "../../io/Effect"
import { Effect } from "../../io/Effect"
import type { Hub } from "../../io/Hub"
import type { Ref } from "../../io/Ref"
import { RefSym } from "../../io/Ref"
import { concreteSynchronizedRef } from "../../io/Ref/Synchronized/operations/_internal/SynchronizedRefInternal"
import { _A } from "../../support/Symbols"
import { Stream } from "../Stream"

export const SubscriptionRefSym = Symbol.for("@effect-ts/core/stream/SubscriptionRef")
export type SubscriptionRefSym = typeof SubscriptionRefSym

/**
 * A `SubscriptionRef<A>` contains a `Ref.Synchronized` with a value of type `A`
 * and a `Stream` that can be subscribed to in order to receive the current
 * value as well as all changes to the value.
 *
 * @tsplus type ets/SubscriptionRef
 * @tsplus companion ets/SubscriptionRefOps
 */
export class SubscriptionRef<A> implements Ref.Synchronized<A> {
  readonly [SubscriptionRefSym]: SubscriptionRefSym = SubscriptionRefSym;
  readonly [RefSym]: RefSym = RefSym;
  readonly [_A]!: () => A

  constructor(public ref: Ref.Synchronized<A>, public hub: Hub<A>) {}

  get get(): UIO<A> {
    return this.ref.get
  }

  get changes(): Stream<unknown, never, A> {
    return Stream.unwrapScoped(
      this.ref.modifyEffect((a) =>
        Stream.fromHubScoped(this.hub).map((stream) => Tuple(Stream(a) + stream, a))
      )
    )
  }

  set(a: A, __tsplusTrace?: string): UIO<void> {
    return this.ref.set(a)
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string | undefined): UIO<B> {
    concreteSynchronizedRef(this.ref)
    return this.ref.semaphore.withPermit(
      this.modifyEffect((a) => Effect.succeedNow(f(a)))
    )
  }

  modifyEffect<R, E, B>(
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
    __tsplusTrace?: string
  ): Effect<R, E, B> {
    return this.ref.modifyEffect((a) =>
      f(a).tap(({ tuple: [_, a] }) => this.hub.publish(a))
    )
  }
}
