import type { _A } from "@effect/core/io/Ref/definition"
import { RefSym, SynchronizedSym } from "@effect/core/io/Ref/definition"
import { SynchronizedInternal } from "@effect/core/io/Ref/operations/_internal/SynchronizedInternal"
import { SubscriptionRefSym } from "@effect/core/stream/SubscriptionRef/definition"

export interface SubscriptionRefInternal<A> extends Ref.Synchronized<A> {
  ref: Ref.Synchronized<A>
  hub: Hub<A>
}

export const SubscriptionRefInternal = {
  ...SynchronizedInternal,
  /**
   * Internal Discriminators
   */
  get [RefSym](): RefSym {
    return RefSym
  },
  get [SynchronizedSym](): SynchronizedSym {
    return SynchronizedSym
  },
  get [SubscriptionRefSym](): SubscriptionRefSym {
    return SubscriptionRefSym
  },
  get changes(): Stream.UIO<unknown> {
    return Stream.unwrapScoped(
      (this as unknown as SubscriptionRefInternal<unknown>).ref.modifyEffect(a =>
        Stream.fromHubScoped((this as unknown as SubscriptionRefInternal<unknown>).hub).map(stream =>
          Tuple(Stream(a).concat(stream), a)
        )
      )
    )
  },
  get<A>(this: SubscriptionRefInternal<A>, __tsplusTrace?: string): Effect.UIO<A> {
    return this.ref.get()
  },
  modifyEffect<R, E, A, B>(
    this: SubscriptionRefInternal<A>,
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
    __tsplusTrace?: string
  ): Effect<R, E, B> {
    return this.ref.modifyEffect(a => f(a).tap((tp) => this.hub.publish(tp.get(1))))
  },
  /**
   * Writes a new value to the `Ref`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  set<A>(this: SubscriptionRefInternal<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
    return this.ref.set(a)
  },
  /**
   * Writes a new value to the `Ref` without providing a guarantee of
   * immediate consistency.
   */
  setAsync<A>(this: SubscriptionRefInternal<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
    return this.ref.setAsync(a)
  }
}
