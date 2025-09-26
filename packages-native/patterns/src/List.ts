/**
 * @since 0.0.0
 */
import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as internal from "./internal/list.js"

/**
 * @since 0.0.0
 * @category type id
 */
export const TypeId: typeof internal.TypeId = internal.TypeId

/**
 * @since 0.0.0
 * @category type id
 */
export type TypeId = internal.TypeId

/**
 * @since 0.0.0
 * @category models
 */
export interface List<A> extends internal.List<A> {}

/**
 * @since 0.0.0
 * @category constructors
 */
export const empty: typeof internal.empty = internal.empty

/**
 * @since 0.0.0
 * @category constructors
 */
export const cons = dual<
  /**
   * @since 0.0.0
   * @category constructors
   */
  <A>(value: A) => (self: List<A>) => List<A>,
  /**
   * @since 0.0.0
   * @category constructors
   */
  <A>(self: List<A>, value: A) => List<A>
>(2, internal.cons)

/**
 * @since 0.0.0
 * @category constructors
 */
export const fromIterable: typeof internal.fromIterable = internal.fromIterable

/**
 * @since 0.0.0
 * @category constructors
 */
export const of: typeof internal.of = internal.of

/**
 * @since 0.0.0
 * @category refinements
 */
export const isList: typeof internal.isList = internal.isList

/**
 * @since 0.0.0
 * @category getters
 */
export const toArray: typeof internal.toArray = internal.toArray

/**
 * @since 0.0.0
 * @category combinators
 */
export const map = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(f: (value: A, index: number) => B) => (self: List<A>) => List<B>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(self: List<A>, f: (value: A, index: number) => B) => List<B>
>(2, internal.map)

/**
 * @since 0.0.0
 * @category combinators
 */
export const append = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A>(value: A) => (self: List<A>) => List<A>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A>(self: List<A>, value: A) => List<A>
>(2, internal.append)

/**
 * @since 0.0.0
 * @category folding
 */
export const reduce = dual<
  /**
   * @since 0.0.0
   * @category folding
   */
  <A, B>(initial: B, f: (accumulator: B, value: A, index: number) => B) => (self: List<A>) => B,
  /**
   * @since 0.0.0
   * @category folding
   */
  <A, B>(
    self: List<A>,
    initial: B,
    f: (accumulator: B, value: A, index: number) => B
  ) => B
>(3, internal.reduce)

/**
 * @since 0.0.0
 * @category traversing
 */
export const forEachEffect = dual<
  /**
   * @since 0.0.0
   * @category traversing
   */
  <A, E, R>(f: (value: A, index: number) => Effect.Effect<void, E, R>) => (self: List<A>) => Effect.Effect<void, E, R>,
  /**
   * @since 0.0.0
   * @category traversing
   */
  <A, E, R>(self: List<A>, f: (value: A, index: number) => Effect.Effect<void, E, R>) => Effect.Effect<void, E, R>
>(2, internal.forEachEffect)
