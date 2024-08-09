/**
 * @since 2.0.0
 */
import * as internal from "./internal/stm/tSubscriptionRef.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as STM from "./STM.js"
import type * as Stream from "./Stream.js"
import type * as TPubSub from "./TPubSub.js"
import type * as TRef from "./TRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TSubscriptionRefTypeId: unique symbol = internal.TSubscriptionRefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TSubscriptionRefTypeId = typeof TSubscriptionRefTypeId

/**
 * A `TSubscriptionRef<A>` is a `TRef` that can be subscribed to in order to
 * receive the current value as well as a `Stream` of all changes to the value.
 *
 * @since 2.0.0
 * @category models
 */
export interface TSubscriptionRef<in out A> extends TSubscriptionRef.Variance<A>, Pipeable {
  /** @internal */
  readonly ref: TRef.TRef<A>
  /** @internal */
  readonly pubsub: TPubSub.TPubSub<A>
  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  readonly changes: Stream.Stream<A>

  /** @internal */
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<B>
}

/**
 * @since 2.0.0
 */
export declare namespace TSubscriptionRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out A> {
    readonly [TSubscriptionRefTypeId]: {
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * @since 2.0.0
 * @category mutations
 */
export const get: <A>(self: TSubscriptionRef<A>) => STM.STM<A> = internal.get

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndSet: {
  <A>(value: A): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, value: A): STM.STM<A>
} = internal.getAndSet

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => A): STM.STM<A>
} = internal.getAndUpdate

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndUpdateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => Option.Option<A>): STM.STM<A>
} = internal.getAndUpdateSome

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => STM.STM<TSubscriptionRef<A>> = internal.make

/**
 * @since 2.0.0
 * @category mutations
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: TSubscriptionRef<A>) => STM.STM<B>
  <A, B>(self: TSubscriptionRef<A>, f: (a: A) => readonly [B, A]): STM.STM<B>
} = internal.modify

/**
 * @since 2.0.0
 * @category mutations
 */
export const modifySome: {
  <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>): (self: TSubscriptionRef<A>) => STM.STM<B>
  <A, B>(self: TSubscriptionRef<A>, fallback: B, f: (a: A) => Option.Option<readonly [B, A]>): STM.STM<B>
} = internal.modifySome

/**
 * @since 2.0.0
 * @category mutations
 */
export const set: {
  <A>(value: A): (self: TSubscriptionRef<A>) => STM.STM<void>
  <A>(self: TSubscriptionRef<A>, value: A): STM.STM<void>
} = internal.set

/**
 * @since 2.0.0
 * @category mutations
 */
export const setAndGet: {
  <A>(value: A): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, value: A): STM.STM<A>
} = internal.setAndGet

/**
 * @since 2.0.0
 * @category mutations
 */
export const update: {
  <A>(f: (a: A) => A): (self: TSubscriptionRef<A>) => STM.STM<void>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => A): STM.STM<void>
} = internal.update

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => A): STM.STM<A>
} = internal.updateAndGet

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: TSubscriptionRef<A>) => STM.STM<void>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => Option.Option<A>): STM.STM<void>
} = internal.updateSome

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateSomeAndGet: {
  <A>(f: (a: A) => Option.Option<A>): (self: TSubscriptionRef<A>) => STM.STM<A>
  <A>(self: TSubscriptionRef<A>, f: (a: A) => Option.Option<A>): STM.STM<A>
} = internal.updateSomeAndGet
