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
import type * as Unify from "./Unify.js"

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
  modifyEffect<B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R>
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: SynchronizedRefUnify<this>
  readonly [Unify.ignoreSymbol]?: SynchronizedRefUnifyIgnore
}

/**
 * @category models
 * @since 3.8.0
 */
export interface SynchronizedRefUnify<A extends { [Unify.typeSymbol]?: any }> extends Ref.RefUnify<A> {
  SynchronizedRef?: () => Extract<A[Unify.typeSymbol], SynchronizedRef<any>>
}

/**
 * @category models
 * @since 3.8.0
 */
export interface SynchronizedRefUnifyIgnore extends Ref.RefUnifyIgnore {
  Ref?: true
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
export const make: <A>(value: A) => Effect.Effect<SynchronizedRef<A>> = circular.makeSynchronized

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: SynchronizedRef<A>) => Effect.Effect<A> = ref.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<A>
} = ref.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<A>
} = ref.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = internal.getAndUpdateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>
} = ref.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSomeEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>): Effect.Effect<A, E, R>
} = internal.getAndUpdateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SynchronizedRef<A>) => Effect.Effect<B>
  <A, B>(self: SynchronizedRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifyEffect: {
  <A, B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): (self: SynchronizedRef<A>) => Effect.Effect<B, E, R>
  <A, B, E, R>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R>
} = internal.modifyEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): (self: Ref.Ref<A>) => Effect.Effect<B>
  <A, B>(
    self: Ref.Ref<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect.Effect<B>
} = ref.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<readonly [B, A], E, R>>
  ): (self: SynchronizedRef<A>) => Effect.Effect<B, E, R>
  <A, B, R, E>(
    self: SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<readonly [B, A], E, R>>
  ): Effect.Effect<B, E, R>
} = internal.modifySomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<void>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<void>
} = ref.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<A>
} = ref.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<void>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<void>
} = ref.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<void, E, R>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<void, E, R>
} = internal.updateEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<A>
} = ref.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = internal.updateAndGetEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<void>
  <A>(self: Ref.Ref<A>, f: (a: A) => Option.Option<A>): Effect.Effect<void>
} = ref.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ): (self: SynchronizedRef<A>) => Effect.Effect<void, E, R>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>): Effect.Effect<void, E, R>
} = internal.updateSomeEffect

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>
} = ref.updateSomeAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGetEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>): Effect.Effect<A, E, R>
} = circular.updateSomeAndGetEffectSynchronized

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <A>(value: A) => SynchronizedRef<A> = circular.unsafeMakeSynchronized
