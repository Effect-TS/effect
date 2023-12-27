/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import * as internal from "./internal/subscriptionRef.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as PubSub from "./PubSub.js"
import * as Ref from "./Ref.js"
import type * as Stream from "./Stream.js"
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
  extends SubscriptionRef.Variance<A>, Synchronized.SynchronizedRef<A>, Pipeable
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
  readonly changes: Stream.Stream<never, never, A>
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
export const get: <A>(self: SubscriptionRef<A>) => Effect.Effect<never, never, A> = internal.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, A>
} = Ref.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = Ref.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = Synchronized.getAndUpdateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = Ref.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): Effect.Effect<R, E, A>
} = Synchronized.getAndUpdateSomeEffect

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => Effect.Effect<never, never, SubscriptionRef<A>> = internal.make

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SubscriptionRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: SubscriptionRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifyEffect: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
} = internal.modifyEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): (self: SubscriptionRef<A>) => Effect.Effect<never, never, B>
  <A, B>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect.Effect<never, never, B>
} = Ref.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, B>
  <A, B, R, E>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): Effect.Effect<R, E, B>
} = Synchronized.modifySomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, void>
} = internal.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, A>
} = Ref.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, void>
} = Ref.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, void>
} = Synchronized.updateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = Ref.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = Synchronized.updateAndGetEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
} = Ref.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): Effect.Effect<R, E, void>
} = Synchronized.updateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = Ref.updateSomeAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGetEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): Effect.Effect<R, E, A>
} = Synchronized.updateSomeAndGetEffect
