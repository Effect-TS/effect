/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import * as internal from "./internal/ref.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const RefTypeId: unique symbol = internal.RefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type RefTypeId = typeof RefTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Ref<A> extends Ref.Variance<A>, Pipeable {
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}

/**
 * @since 2.0.0
 * @category models
 */
export declare namespace Ref {
  /**
   * @since 2.0.0
   */
  export interface Variance<A> {
    readonly [RefTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => Effect.Effect<never, never, Ref<A>> = internal.make

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: Ref<A>) => Effect.Effect<never, never, A> = internal.get

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, A>
} = internal.getAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = internal.getAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = internal.getAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: Ref<A>) => Effect.Effect<never, never, B>
  <A, B>(self: Ref<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
} = internal.modify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: {
  <B, A>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): (self: Ref<A>) => Effect.Effect<never, never, B>
  <A, B>(self: Ref<A>, fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): Effect.Effect<never, never, B>
} = internal.modifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, void>
} = internal.set

/**
 * @since 2.0.0
 * @category utils
 */
export const setAndGet: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, A>
} = internal.setAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, void>
} = internal.update

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = internal.updateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
} = internal.updateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = internal.updateSomeAndGet

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <A>(value: A) => Ref<A> = internal.unsafeMake
