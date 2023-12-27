/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import * as circular from "./internal/effect/circular.js"
import * as ref from "./internal/ref.js"
import * as internal from "./internal/synchronizedRef.js"
import type * as Option from "./Option.js"
import type * as Ref from "./Ref.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const SynchronizedRefTypeId: unique symbol = circular.SynchronizedTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SynchronizedRefTypeId = typeof SynchronizedRefTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface SynchronizedRef<in out A> extends SynchronizedRef.Variance<A>, Ref.Ref<A> {
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}

/**
 * @since 2.0.0
 */
export declare namespace SynchronizedRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out A> {
    readonly [SynchronizedRefTypeId]: {
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => Effect.Effect<never, never, SynchronizedRef<A>> = circular.makeSynchronized

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: SynchronizedRef<A>) => Effect.Effect<never, never, A> = ref.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, A>
} = ref.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = ref.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = internal.getAndUpdateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = ref.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSomeEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
} = internal.getAndUpdateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SynchronizedRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: SynchronizedRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifyEffect: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
} = internal.modifyEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): (self: Ref.Ref<A>) => Effect.Effect<never, never, B>
  <A, B>(
    self: Ref.Ref<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect.Effect<never, never, B>
} = ref.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): (self: SynchronizedRef<A>) => Effect.Effect<R, E, B>
  <A, B, R, E>(
    self: SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): Effect.Effect<R, E, B>
} = internal.modifySomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, void>
} = ref.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, A>
} = ref.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, void>
} = ref.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, void>
} = internal.updateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = ref.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
} = internal.updateAndGetEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
} = ref.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): (self: SynchronizedRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, void>
} = internal.updateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = ref.updateSomeAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGetEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
} = circular.updateSomeAndGetEffectSynchronized

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <A>(value: A) => SynchronizedRef<A> = circular.unsafeMakeSynchronized
