/**
 * @since 0.0.0
 */
import type * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as internal from "./internal/tree.js"

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
export interface Tree<A> extends internal.Tree<A> {}

/**
 * @since 0.0.0
 * @category constructors
 */
export const make: typeof internal.make = internal.make

/**
 * @since 0.0.0
 * @category constructors
 */
export const of: typeof internal.of = internal.of

/**
 * @since 0.0.0
 * @category refinements
 */
export const isTree: typeof internal.isTree = internal.isTree

/**
 * @since 0.0.0
 * @category getters
 */
export const children: typeof internal.children = internal.children

/**
 * @since 0.0.0
 * @category getters
 */
export const toArray: typeof internal.toArray = internal.toArray

/**
 * @since 0.0.0
 * @category combinators
 */
export const appendChild = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A>(child: Tree<A>) => (self: Tree<A>) => Tree<A>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A>(self: Tree<A>, child: Tree<A>) => Tree<A>
>(2, internal.appendChild)

/**
 * @since 0.0.0
 * @category combinators
 */
export const map = dual<
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(f: (value: A) => B) => (self: Tree<A>) => Tree<B>,
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, B>(self: Tree<A>, f: (value: A) => B) => Tree<B>
>(2, internal.map)

/**
 * @since 0.0.0
 * @category folding
 */
export const reduce = dual<
  /**
   * @since 0.0.0
   * @category folding
   */
  <A, B>(initial: B, f: (accumulator: B, value: A) => B) => (self: Tree<A>) => B,
  /**
   * @since 0.0.0
   * @category folding
   */
  <A, B>(self: Tree<A>, initial: B, f: (accumulator: B, value: A) => B) => B
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
  <A, E, R>(
    f: (value: A, indexPath: ReadonlyArray<number>) => Effect.Effect<void, E, R>
  ) => (self: Tree<A>) => Effect.Effect<void, E, R>,
  /**
   * @since 0.0.0
   * @category traversing
   */
  <A, E, R>(
    self: Tree<A>,
    f: (value: A, indexPath: ReadonlyArray<number>) => Effect.Effect<void, E, R>
  ) => Effect.Effect<void, E, R>
>(2, internal.forEachEffect)
