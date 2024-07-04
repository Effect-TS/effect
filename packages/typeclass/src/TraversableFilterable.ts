/**
 * `TraversableFilterable` represents data structures which can be _partitioned_ with effects in some `Applicative` functor.
 *
 * @since 0.24.0
 */
import type { Either } from "effect/Either"
import * as E from "effect/Either"
import { dual } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"
import type { Option } from "effect/Option"
import * as O from "effect/Option"
import type { Applicative } from "./Applicative.js"
import type { Covariant } from "./Covariant.js"
import * as filterable from "./Filterable.js"
import type { Filterable } from "./Filterable.js"
import type { Traversable } from "./Traversable.js"

/**
 * @category models
 * @since 0.24.0
 */
export interface TraversableFilterable<T extends TypeLambda> extends TypeClass<T> {
  readonly traversePartitionMap: <F extends TypeLambda>(
    F: Applicative<F>
  ) => {
    <A, R, O, E, B, C>(
      f: (a: A) => Kind<F, R, O, E, Either<C, B>>
    ): <TR, TO, TE>(
      self: Kind<T, TR, TO, TE, A>
    ) => Kind<F, R, O, E, [Kind<T, TR, TO, TE, B>, Kind<T, TR, TO, TE, C>]>
    <TR, TO, TE, A, R, O, E, B, C>(
      self: Kind<T, TR, TO, TE, A>,
      f: (a: A) => Kind<F, R, O, E, Either<C, B>>
    ): Kind<F, R, O, E, [Kind<T, TR, TO, TE, B>, Kind<T, TR, TO, TE, C>]>
  }

  readonly traverseFilterMap: <F extends TypeLambda>(
    F: Applicative<F>
  ) => {
    <A, R, O, E, B>(
      f: (a: A) => Kind<F, R, O, E, Option<B>>
    ): <TR, TO, TE>(self: Kind<T, TR, TO, TE, A>) => Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
    <TR, TO, TE, A, R, O, E, B>(
      self: Kind<T, TR, TO, TE, A>,
      f: (a: A) => Kind<F, R, O, E, Option<B>>
    ): Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
  }
}

/**
 * Returns a default binary `traversePartitionMap` implementation.
 *
 * @since 0.24.0
 */
export const traversePartitionMap = <T extends TypeLambda>(
  T: Traversable<T> & Covariant<T> & Filterable<T>
): <F extends TypeLambda>(
  F: Applicative<F>
) => <TR, TO, TE, A, R, O, E, B, C>(
  self: Kind<T, TR, TO, TE, A>,
  f: (a: A) => Kind<F, R, O, E, Either<C, B>>
) => Kind<F, R, O, E, [Kind<T, TR, TO, TE, B>, Kind<T, TR, TO, TE, C>]> =>
(F) =>
(self, f) => F.map(T.traverse(F)(self, f), filterable.separate(T))

/**
 * Returns a default binary `traverseFilterMap` implementation.
 *
 * @since 0.24.0
 */
export const traverseFilterMap = <T extends TypeLambda>(
  T: Traversable<T> & Filterable<T>
): <F extends TypeLambda>(
  F: Applicative<F>
) => <TR, TO, TE, A, R, O, E, B>(
  self: Kind<T, TR, TO, TE, A>,
  f: (a: A) => Kind<F, R, O, E, Option<B>>
) => Kind<F, R, O, E, Kind<T, TR, TO, TE, B>> =>
(F) =>
(self, f) => F.map(T.traverse(F)(self, f), filterable.compact(T))

/**
 * @since 0.24.0
 */
export const traverseFilter = <T extends TypeLambda>(
  T: TraversableFilterable<T>
) =>
<F extends TypeLambda>(
  F: Applicative<F>
): {
  <B extends A, R, O, E, A = B>(
    predicate: (a: A) => Kind<F, R, O, E, boolean>
  ): <TR, TO, TE>(
    self: Kind<T, TR, TO, TE, B>
  ) => Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
  <TR, TO, TE, B extends A, R, O, E, A = B>(
    self: Kind<T, TR, TO, TE, B>,
    predicate: (a: A) => Kind<F, R, O, E, boolean>
  ): Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
} =>
  dual(2, <TR, TO, TE, B extends A, R, O, E, A = B>(
    self: Kind<T, TR, TO, TE, B>,
    predicate: (a: A) => Kind<F, R, O, E, boolean>
  ): Kind<F, R, O, E, Kind<T, TR, TO, TE, B>> =>
    T.traverseFilterMap(F)(
      self,
      (b) => F.map(predicate(b), (keep) => (keep ? O.some(b) : O.none()))
    ))

/**
 * @since 0.24.0
 */
export const traversePartition = <T extends TypeLambda>(
  T: TraversableFilterable<T>
) =>
<F extends TypeLambda>(
  F: Applicative<F>
): {
  <B extends A, R, O, E, A = B>(
    predicate: (a: A) => Kind<F, R, O, E, boolean>
  ): <TR, TO, TE>(
    self: Kind<T, TR, TO, TE, B>
  ) => Kind<F, R, O, E, [Kind<T, TR, TO, TE, B>, Kind<T, TR, TO, TE, B>]>
  <TR, TO, TE, B extends A, R, O, E, A = B>(
    self: Kind<T, TR, TO, TE, B>,
    predicate: (a: A) => Kind<F, R, O, E, boolean>
  ): Kind<F, R, O, E, [Kind<T, TR, TO, TE, B>, Kind<T, TR, TO, TE, B>]>
} =>
  dual(2, (self, predicate) =>
    T.traversePartitionMap(F)(self, (b) =>
      F.map(
        predicate(b),
        (keep): E.Either<typeof b, typeof b> => (keep ? E.right(b) : E.left(b))
      )))
