import { Effect } from "@effect/core/io/Effect"
import { _A, RefSym, SynchronizedSym } from "@effect/core/io/Ref/definition"
import { SubscriptionRefSym } from "@effect/core/stream/SubscriptionRef/definition"
import type { Maybe } from "@tsplus/stdlib/data/Maybe"

export class SubscriptionRefInternal<A> implements SubscriptionRef<A> {
  get [RefSym](): RefSym {
    return RefSym
  }
  get [SynchronizedSym](): SynchronizedSym {
    return SynchronizedSym
  }
  get [SubscriptionRefSym](): SubscriptionRefSym {
    return SubscriptionRefSym
  }
  get [_A](): (_: never) => A {
    return (a) => a
  }
  constructor(readonly ref: Ref<A>, readonly hub: Hub<A>, readonly semaphore: TSemaphore) {}
  get changes(): Stream.UIO<A> {
    return Stream.unwrapScoped(
      this.semaphore.withPermit(
        this.ref.get.flatMap((a) =>
          Stream.fromHubScoped(this.hub).map((stream) => Stream(a).concat(stream))
        )
      )
    )
  }
  modifyEffect<R, E, B>(this: this, f: (a: A) => Effect<R, E, readonly [B, A]>): Effect<R, E, B> {
    return this.semaphore.withPermit(
      this.get.flatMap(f).flatMap((tp) => {
        const [b, a] = tp

        return this.ref.set(a).as(b).tap(() => this.hub.publish(a))
      })
    )
  }
  getAndUpdateEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, A> {
    return this.modifyEffect((v) => f(v).map((result) => [v, result]))
  }
  getAndUpdateSomeEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, A> {
    return this.modifyEffect(v => pf(v).getOrElse(Effect.succeed(v)).map((result) => [v, result]))
  }
  modifySomeEffect<R, E, B>(
    this: this,
    fallback: B,
    pf: (a: A) => Maybe<Effect<R, E, readonly [B, A]>>
  ): Effect<R, E, B> {
    return this.modifyEffect(v => pf(v).getOrElse(Effect.succeed([fallback, v] as const)))
  }
  updateEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, void> {
    return this.modifyEffect(v => f(v).map(result => [undefined as void, result] as const))
  }
  updateAndGetEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, A> {
    return this.modifyEffect(v => f(v).map(result => [result, result] as const))
  }
  updateSomeEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, void> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => [undefined as void, result] as const)
    )
  }
  updateSomeAndGetEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, A> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => [result, result] as const)
    )
  }
  get get(): Effect<never, never, A> {
    return this.ref.get
  }
  modify<B>(this: this, f: (a: A) => readonly [B, A]): Effect<never, never, B> {
    return this.modifyEffect((a) => Effect.sync(f(a)))
  }
  set(this: this, a: A): Effect<never, never, void> {
    return this.semaphore.withPermit(this.ref.set(a).tap(() => this.hub.publish(a)))
  }
  getAndSet(this: this, a: A): Effect<never, never, A> {
    return this.modify((v) => [v, a] as const)
  }
  getAndUpdate(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify((v) => [v, f(v)] as const)
  }
  getAndUpdateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify((v) => [v, pf(v).getOrElse(v)] as const)
  }
  modifySome<B>(
    this: this,
    fallback: B,
    pf: (a: A) => Maybe<readonly [B, A]>
  ): Effect<never, never, B> {
    return this.modify((v) => pf(v).getOrElse([fallback, v] as const))
  }
  update(this: this, f: (a: A) => A): Effect<never, never, void> {
    return this.modify((v) => [undefined as void, f(v)] as const)
  }
  updateAndGet(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify(v => {
      const result = f(v)
      return [result, result] as const
    })
  }
  updateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, void> {
    return this.modify((v) => [undefined as void, pf(v).getOrElse(v)] as const)
  }
  updateSomeAndGet(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify(v => {
      const result = pf(v).getOrElse(v)
      return [result, result] as const
    })
  }
}
