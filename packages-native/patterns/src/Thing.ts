/**
 * @since 0.0.0
 */
import { dual } from "effect/Function"
import * as internal from "./internal/thing.js"

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
export interface Thing<A> extends internal.Thing<A> {}

/**
 * @since 0.0.0
 * @category constructors
 */
export const make: typeof internal.make = internal.make

/**
 * @since 0.0.0
 * @category refinements
 */
export const isThing: typeof internal.isThing = internal.isThing

/**
 * @since 0.0.0
 * @category combinators
 */
export const mapValue = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(f: (value: A) => B) => (self: Thing<A>) => Thing<B>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(self: Thing<A>, f: (value: A) => B) => Thing<B>
>(2, internal.mapValue)

/**
 * @since 0.0.0
 * @category combinators
 */
export const addTag = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  (tag: string) => <A>(self: Thing<A>) => Thing<A>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A>(self: Thing<A>, tag: string) => Thing<A>
>(2, internal.addTag)

/**
 * Configuration used to construct a `Thing`.
 *
 * @since 0.0.0
 * @category models
 */
export type ThingInput<A> = internal.ThingInput<A>
