import { Effect } from "@effect/core/io/Effect"
import { _A, RefSym, SynchronizedSym } from "@effect/core/io/Ref/definition"
import type { Maybe } from "@tsplus/stdlib/data/Maybe"
import { Tuple } from "@tsplus/stdlib/data/Tuple"

export class SynchronizedInternal<A> implements Ref.Synchronized<A> {
  get [RefSym](): RefSym {
    return RefSym
  }
  get [SynchronizedSym](): SynchronizedSym {
    return SynchronizedSym
  }
  get [_A](): (_: never) => A {
    return (a) => a
  }
  constructor(readonly ref: Ref<A>, readonly semaphore: TSemaphore) {}
  modifyEffect<R, E, B>(
    this: this,
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>
  ): Effect<R, E, B> {
    return this.semaphore.withPermit(
      this.get.flatMap(f).flatMap((tp) => {
        const { tuple: [b, a] } = tp

        return this.ref.set(a).as(b)
      })
    )
  }
  getAndUpdateEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, A> {
    return this.modifyEffect((v) => f(v).map((result) => Tuple(v, result)))
  }
  getAndUpdateSomeEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, A> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map((result) => Tuple(v, result))
    )
  }
  modifySomeEffect<R, E, B>(
    this: this,
    fallback: B,
    pf: (a: A) => Maybe<Effect<R, E, Tuple<[B, A]>>>
  ): Effect<R, E, B> {
    return this.modifyEffect(v => pf(v).getOrElse(Effect.succeed(Tuple(fallback, v))))
  }
  updateEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, void> {
    return this.modifyEffect(v => f(v).map(result => Tuple(undefined as void, result)))
  }
  updateAndGetEffect<R, E>(this: this, f: (a: A) => Effect<R, E, A>): Effect<R, E, A> {
    return this.modifyEffect(v => f(v).map(result => Tuple(result, result)))
  }
  updateSomeEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, void> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => Tuple(undefined as void, result))
    )
  }
  updateSomeAndGetEffect<R, E>(this: this, pf: (a: A) => Maybe<Effect<R, E, A>>): Effect<R, E, A> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => Tuple(result, result))
    )
  }
  get get(): Effect<never, never, A> {
    return this.ref.get
  }
  modify<B>(this: this, f: (a: A) => Tuple<[B, A]>): Effect<never, never, B> {
    return this.modifyEffect((a) => Effect.succeed(f(a)))
  }
  set(this: this, a: A): Effect<never, never, void> {
    return this.semaphore.withPermit(this.ref.set(a))
  }
  getAndSet(this: this, a: A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, a))
  }
  getAndUpdate(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, f(v)))
  }
  getAndUpdateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify((v) => Tuple(v, pf(v).getOrElse(v)))
  }
  modifySome<B>(
    this: this,
    fallback: B,
    pf: (a: A) => Maybe<Tuple<[B, A]>>
  ): Effect<never, never, B> {
    return this.modify((v) => pf(v).getOrElse(Tuple(fallback, v)))
  }
  update(this: this, f: (a: A) => A): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, f(v)))
  }
  updateAndGet(this: this, f: (a: A) => A): Effect<never, never, A> {
    return this.modify(v => {
      const result = f(v)

      return Tuple(result, result)
    })
  }
  updateSome(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined as void, pf(v).getOrElse(v)))
  }
  updateSomeAndGet(
    this: this,
    pf: (a: A) => Maybe<A>
  ): Effect<never, never, A> {
    return this.modify(v => {
      const result = pf(v).getOrElse(v)
      return Tuple(result, result)
    })
  }
}
