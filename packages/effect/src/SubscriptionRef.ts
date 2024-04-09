/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import * as internal from "./internal/subscriptionRef.js"
import type * as Option from "./Option.js"
import type * as PubSub from "./PubSub.js"
import * as Ref from "./Ref.js"
import type * as Stream from "./Stream.js"
import type { Subscribable } from "./Subscribable.js"
import * as Synchronized from "./SynchronizedRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const SubscriptionRefTypeId: unique symbol = internal.SubscriptionRefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SubscriptionRefTypeId = typeof SubscriptionRefTypeId

/**
 * A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
 * receive the current value as well as all changes to the value.
 *
 * @since 2.0.0
 * @category models
 */
export interface SubscriptionRef<in out A>
  extends SubscriptionRef.Variance<A>, Synchronized.SynchronizedRef<A>, Subscribable<A>
{
  /** @internal */
  readonly ref: Ref.Ref<A>
  /** @internal */
  readonly pubsub: PubSub.PubSub<A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  readonly changes: Stream.Stream<A>
}

/**
 * @since 2.0.0
 */
export declare namespace SubscriptionRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out A> {
    readonly [SubscriptionRefTypeId]: {
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: SubscriptionRef<A>) => Effect.Effect<A> = internal.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<A>
} = Ref.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<A>
} = Ref.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SubscriptionRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = Synchronized.getAndUpdateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>
} = Ref.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): Effect.Effect<A, E, R>
} = Synchronized.getAndUpdateSomeEffect

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => Effect.Effect<SubscriptionRef<A>> = internal.make

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SubscriptionRef<A>) => Effect.Effect<B>
  <A, B>(self: SubscriptionRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifyEffect: {
  <B, A, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): (self: SubscriptionRef<A>) => Effect.Effect<B, E, R>
  <A, B, E, R>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R>
} = internal.modifyEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): (self: SubscriptionRef<A>) => Effect.Effect<B>
  <A, B>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect.Effect<B>
} = Ref.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<readonly [B, A], E, R>>
  ): (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<B, E, R>
  <A, B, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<readonly [B, A], E, R>>
  ): Effect.Effect<B, E, R>
} = Synchronized.modifySomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<void>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<void>
} = internal.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<A>
} = Ref.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<void>
} = Ref.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<void, E, R>
  <A, R, E>(self: Synchronized.SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<void, E, R>
} = Synchronized.updateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<A>
} = Ref.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SubscriptionRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = Synchronized.updateAndGetEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => Option.Option<A>): Effect.Effect<void>
} = Ref.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<void, E, R>
  <A, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): Effect.Effect<void, E, R>
} = Synchronized.updateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>
} = Ref.updateSomeAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGetEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): Effect.Effect<A, E, R>
} = Synchronized.updateSomeAndGetEffect
