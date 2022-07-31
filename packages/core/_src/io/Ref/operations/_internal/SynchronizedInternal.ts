import { RefSym, SynchronizedSym } from "@effect/core/io/Ref/definition"
import type { _A } from "@effect/core/io/Ref/definition"
import { RefInternal } from "@effect/core/io/Ref/operations/_internal/RefInternal"

export interface SynchronizedInternal<A> extends Ref.Synchronized<A> {
  readonly ref: Ref<A>
  readonly semaphore: TSemaphore
}

export const SynchronizedInternal = {
  ...RefInternal,
  /**
   * Internal Discriminators
   */
  get [RefSym](): RefSym {
    return RefSym
  },
  get [SynchronizedSym](): SynchronizedSym {
    return SynchronizedSym
  },
  /**
   * Reads the value from the `Ref`.
   */
  get<A>(this: SynchronizedInternal<A>): Effect<never, never, A> {
    return this.ref.get()
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified function,
   * which computes a return value for the modification. This is a more
   * powerful version of `update`.
   */
  modifyEffect<R, E, A, B>(
    this: SynchronizedInternal<A>,
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>
  ): Effect<R, E, B> {
    return this.semaphore.withPermit(
      this.get().flatMap(f).flatMap((tp) => {
        const { tuple: [b, a] } = tp

        return this.ref.set(a).as(b)
      })
    )
  },
  /**
   * Writes a new value to the `Ref`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  set<A>(this: SynchronizedInternal<A>, a: A): Effect<never, never, void> {
    return this.semaphore.withPermit(this.ref.set(a))
  },
  /**
   * Writes a new value to the `Ref` without providing a guarantee of
   * immediate consistency.
   */
  setAsync<A>(
    this: SynchronizedInternal<A>,
    a: A
  ): Effect<never, never, void> {
    return this.semaphore.withPermit(this.ref.setAsync(a))
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified function,
   * returning the value immediately before modification.
   */
  getAndUpdateEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    f: (a: A) => Effect<R, E, A>
  ): Effect<R, E, A> {
    return this.modifyEffect((v) => f(v).map((result) => Tuple(v, result)))
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified partial
   * function, returning the value immediately before modification. If the
   * function is undefined on the current value it doesn't change it.
   */
  getAndUpdateSomeEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    pf: (a: A) => Maybe<Effect<R, E, A>>
  ): Effect<R, E, A> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map((result) => Tuple(v, result))
    )
  },
  modify<A, B>(
    this: SynchronizedInternal<A>,
    f: (a: A) => Tuple<[B, A]>
  ): Effect<never, never, B> {
    return this.modifyEffect((a) => Effect.succeed(f(a)))
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified function,
   * which computes a return value for the modification if the function is
   * defined in the current value otherwise it returns a default value. This
   * is a more powerful version of `updateSome`.
   */
  modifySomeEffect<R, E, A, B>(
    this: SynchronizedInternal<A>,
    fallback: B,
    pf: (a: A) => Maybe<Effect<R, E, Tuple<[B, A]>>>
  ): Effect<R, E, B> {
    return this.modifyEffect(v => pf(v).getOrElse(Effect.succeed(Tuple(fallback, v))))
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified function.
   */
  updateEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    f: (a: A) => Effect<R, E, A>
  ): Effect<R, E, void> {
    return this.modifyEffect(v => f(v).map(result => Tuple(undefined as void, result)))
  },
  /**
   * Atomically modifies the `Ref.Synchronized` with the specified function,
   * returning the value immediately after modification.
   */
  updateAndGetEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    f: (a: A) => Effect<R, E, A>
  ): Effect<R, E, A> {
    return this.modifyEffect(v => f(v).map(result => Tuple(result, result)))
  },

  /**
   * Atomically modifies the `Ref.Synchronized` with the specified partial
   * function. If the function is undefined on the current value it doesn't
   * change it.
   */
  updateSomeEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    pf: (a: A) => Maybe<Effect<R, E, A>>
  ): Effect<R, E, void> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => Tuple(undefined as void, result))
    )
  },

  /**
   * Atomically modifies the `Ref.Synchronized` with the specified partial
   * function. If the function is undefined on the current value it returns
   * the old value without changing it.
   */
  updateSomeAndGetEffect<R, E, A>(
    this: SynchronizedInternal<A>,
    pf: (a: A) => Maybe<Effect<R, E, A>>
  ): Effect<R, E, A> {
    return this.modifyEffect(v =>
      pf(v).getOrElse(Effect.succeed(v)).map(result => Tuple(result, result))
    )
  }
}
