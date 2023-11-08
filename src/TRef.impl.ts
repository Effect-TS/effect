/**
 * @since 2.0.0
 */

import * as internal from "./internal/stm/tRef.js"
import type { Option } from "./Option.js"
import type { STM } from "./STM.js"

import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TRefTypeId: unique symbol = internal.TRefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TRefTypeId = typeof TRefTypeId

/**
 * @since 2.0.0
 * @category mutations
 */
export const get: <A>(self: TRef<A>) => STM<never, never, A> = internal.get

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndSet: {
  <A>(value: A): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, value: A): STM<never, never, A>
} = internal.getAndSet

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => A): STM<never, never, A>
} = internal.getAndUpdate

/**
 * @since 2.0.0
 * @category mutations
 */
export const getAndUpdateSome: {
  <A>(f: (a: A) => Option<A>): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => Option<A>): STM<never, never, A>
} = internal.getAndUpdateSome

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(value: A) => STM<never, never, TRef<A>> = internal.make

/**
 * @since 2.0.0
 * @category mutations
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: TRef<A>) => STM<never, never, B>
  <A, B>(self: TRef<A>, f: (a: A) => readonly [B, A]): STM<never, never, B>
} = internal.modify

/**
 * @since 2.0.0
 * @category mutations
 */
export const modifySome: {
  <A, B>(fallback: B, f: (a: A) => Option<readonly [B, A]>): (self: TRef<A>) => STM<never, never, B>
  <A, B>(self: TRef<A>, fallback: B, f: (a: A) => Option<readonly [B, A]>): STM<never, never, B>
} = internal.modifySome

/**
 * @since 2.0.0
 * @category mutations
 */
export const set: {
  <A>(value: A): (self: TRef<A>) => STM<never, never, void>
  <A>(self: TRef<A>, value: A): STM<never, never, void>
} = internal.set

/**
 * @since 2.0.0
 * @category mutations
 */
export const setAndGet: {
  <A>(value: A): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, value: A): STM<never, never, A>
} = internal.setAndGet

/**
 * @since 2.0.0
 * @category mutations
 */
export const update: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM<never, never, void>
  <A>(self: TRef<A>, f: (a: A) => A): STM<never, never, void>
} = internal.update

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => A): STM<never, never, A>
} = internal.updateAndGet

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateSome: {
  <A>(f: (a: A) => Option<A>): (self: TRef<A>) => STM<never, never, void>
  <A>(self: TRef<A>, f: (a: A) => Option<A>): STM<never, never, void>
} = internal.updateSome

/**
 * @since 2.0.0
 * @category mutations
 */
export const updateSomeAndGet: {
  <A>(f: (a: A) => Option<A>): (self: TRef<A>) => STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => Option<A>): STM<never, never, A>
} = internal.updateSomeAndGet
