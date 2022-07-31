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
        Stream.fromHubScoped((this as unknown as SubscriptionRefInternal<unknown>).hub).map(
          stream => Tuple(Stream(a).concat(stream), a)
        )
      )
    )
  },
  get<A>(this: SubscriptionRefInternal<A>): Effect.UIO<A> {
    return this.ref.get()
  },
  modifyEffect<R, E, A, B>(
    this: SubscriptionRefInternal<A>,
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>
  ): Effect<R, E, B> {
    return this.ref.modifyEffect(a => f(a).tap((tp) => this.hub.publish(tp.get(1))))
  },
  set<A>(this: SubscriptionRefInternal<A>, a: A): Effect.UIO<void> {
    return this.ref.set(a)
  },
  setAsync<A>(this: SubscriptionRefInternal<A>, a: A): Effect.UIO<void> {
    return this.ref.setAsync(a)
  }
}
