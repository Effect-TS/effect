/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import * as internal from "./internal/subscriptionRef.js"
import type { Option } from "./Option.js"
import { Ref } from "./Ref.js"
import { SynchronizedRef } from "./SynchronizedRef.js"

import type { SubscriptionRef } from "./SubscriptionRef.js"

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
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: SubscriptionRef<A>) => Effect<never, never, A> = internal.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect<never, never, A>
} = Ref.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect<never, never, A>
} = Ref.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect<R, E, A>): Effect<R, E, A>
} = SynchronizedRef.getAndUpdateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option<A>): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option<A>): Effect<never, never, A>
} = Ref.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option<Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect<R, E, A>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option<Effect<R, E, A>>
  ): Effect<R, E, A>
} = SynchronizedRef.getAndUpdateSomeEffect

/**
 * Creates a new `SubscriptionRef` with the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => Effect<never, never, SubscriptionRef<A>> = internal.make

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SubscriptionRef<A>) => Effect<never, never, B>
  <A, B>(self: SubscriptionRef<A>, f: (a: A) => readonly [B, A]): Effect<never, never, B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifyEffect: {
  <A, R, E, B>(f: (a: A) => Effect<R, E, readonly [B, A]>): (self: SubscriptionRef<A>) => Effect<R, E, B>
  <A, R, E, B>(self: SubscriptionRef<A>, f: (a: A) => Effect<R, E, readonly [B, A]>): Effect<R, E, B>
} = internal.modifyEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option<readonly [B, A]>
  ): (self: SubscriptionRef<A>) => Effect<never, never, B>
  <A, B>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option<readonly [B, A]>
  ): Effect<never, never, B>
} = Ref.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option<Effect<R, E, readonly [B, A]>>
  ): (self: SubscriptionRef<A>) => Effect<R, E, B>
  <A, B, R, E>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option<Effect<R, E, readonly [B, A]>>
  ): Effect<R, E, B>
} = SynchronizedRef.modifySomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, value: A): Effect<never, never, void>
} = internal.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect<never, never, A>
} = Ref.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect<never, never, void>
} = Ref.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateEffect: {
  <A, R, E>(f: (a: A) => Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect<R, E, void>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect<R, E, A>): Effect<R, E, void>
} = SynchronizedRef.updateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect<never, never, A>
} = Ref.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect<R, E, A>): Effect<R, E, A>
} = SynchronizedRef.updateAndGetEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option<A>): (self: SubscriptionRef<A>) => Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => Option<A>): Effect<never, never, void>
} = Ref.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option<Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect<R, E, void>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option<Effect<R, E, A>>
  ): Effect<R, E, void>
} = SynchronizedRef.updateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option<A>): (self: SubscriptionRef<A>) => Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option<A>): Effect<never, never, A>
} = Ref.updateSomeAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGetEffect: {
  <A, R, E>(
    pf: (a: A) => Option<Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect<R, E, A>
  <A, R, E>(
    self: SubscriptionRef<A>,
    pf: (a: A) => Option<Effect<R, E, A>>
  ): Effect<R, E, A>
} = SynchronizedRef.updateSomeAndGetEffect
