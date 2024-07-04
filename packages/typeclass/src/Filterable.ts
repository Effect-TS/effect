/**
 * `Filterable` represents data structures which can be _partitioned_/_filtered_.
 *
 * @since 0.24.0
 */
import * as Either from "effect/Either"
import { dual, identity } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"
import * as Option from "effect/Option"
import type { Covariant } from "./Covariant.js"

/**
 * @category models
 * @since 0.24.0
 */
export interface Filterable<F extends TypeLambda> extends TypeClass<F> {
  readonly partitionMap: {
    <A, B, C>(
      f: (a: A) => Either.Either<C, B>
    ): <R, O, E>(self: Kind<F, R, O, E, A>) => [Kind<F, R, O, E, B>, Kind<F, R, O, E, C>]
    <R, O, E, A, B, C>(
      self: Kind<F, R, O, E, A>,
      f: (a: A) => Either.Either<C, B>
    ): [Kind<F, R, O, E, B>, Kind<F, R, O, E, C>]
  }

  readonly filterMap: {
    <A, B>(
      f: (a: A) => Option.Option<B>
    ): <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => Option.Option<B>): Kind<F, R, O, E, B>
  }
}

/**
 * Returns a default binary `partitionMap` composition.
 *
 * @since 0.24.0
 */
export const partitionMapComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Covariant<F>,
  G: Filterable<G>
) =>
<FR, FO, FE, GR, GO, GE, A, B, C>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  f: (a: A) => Either.Either<C, B>
): [Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, B>>, Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, C>>] => {
  const filterMap = filterMapComposition(F, G)
  return [
    filterMap(self, (a) => Either.getLeft(f(a))),
    filterMap(self, (a) => Either.getRight(f(a)))
  ]
}

/**
 * Returns a default binary `filterMap` composition.
 *
 * @since 0.24.0
 */
export const filterMapComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Covariant<F>,
  G: Filterable<G>
) =>
<FR, FO, FE, GR, GO, GE, A, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  f: (a: A) => Option.Option<B>
): Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, B>> => F.map(self, G.filterMap(f))

/**
 * @since 0.24.0
 */
export const compact = <F extends TypeLambda>(
  F: Filterable<F>
): <R, O, E, A>(self: Kind<F, R, O, E, Option.Option<A>>) => Kind<F, R, O, E, A> => F.filterMap(identity)

/**
 * @since 0.24.0
 */
export const separate = <F extends TypeLambda>(
  F: Filterable<F>
): <R, O, E, A, B>(
  self: Kind<F, R, O, E, Either.Either<B, A>>
) => [Kind<F, R, O, E, A>, Kind<F, R, O, E, B>] => F.partitionMap(identity)

/**
 * @since 0.24.0
 */
export const filter: <F extends TypeLambda>(
  F: Filterable<F>
) => {
  <C extends A, B extends A, A = C>(refinement: (a: A) => a is B): <R, O, E>(
    self: Kind<F, R, O, E, C>
  ) => Kind<F, R, O, E, B>
  <B extends A, A = B>(
    predicate: (a: A) => boolean
  ): <R, O, E>(self: Kind<F, R, O, E, B>) => Kind<F, R, O, E, B>
  <R, O, E, C extends A, B extends A, A = C>(
    self: Kind<F, R, O, E, C>,
    refinement: (a: A) => a is B
  ): Kind<F, R, O, E, B>
  <R, O, E, B extends A, A = B>(
    self: Kind<F, R, O, E, B>,
    predicate: (a: A) => boolean
  ): Kind<F, R, O, E, B>
} = <F extends TypeLambda>(Filterable: Filterable<F>) =>
  dual(
    2,
    <R, O, E, A>(self: Kind<F, R, O, E, A>, predicate: (a: A) => boolean): Kind<F, R, O, E, A> =>
      Filterable.filterMap(self, (b) => (predicate(b) ? Option.some(b) : Option.none()))
  )

/**
 * @since 0.24.0
 */
export const partition = <F extends TypeLambda>(
  F: Filterable<F>
): {
  <C extends A, B extends A, A = C>(refinement: (a: A) => a is B): <R, O, E>(
    self: Kind<F, R, O, E, C>
  ) => [Kind<F, R, O, E, C>, Kind<F, R, O, E, B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): <R, O, E>(
    self: Kind<F, R, O, E, B>
  ) => [Kind<F, R, O, E, B>, Kind<F, R, O, E, B>]
  <R, O, E, C extends A, B extends A, A = C>(
    self: Kind<F, R, O, E, C>,
    refinement: (a: A) => a is B
  ): [Kind<F, R, O, E, C>, Kind<F, R, O, E, B>]
  <R, O, E, B extends A, A = B>(
    self: Kind<F, R, O, E, B>,
    predicate: (a: A) => boolean
  ): [Kind<F, R, O, E, B>, Kind<F, R, O, E, B>]
} =>
  dual(
    2,
    <R, O, E, B extends A, A = B>(
      self: Kind<F, R, O, E, B>,
      predicate: (a: A) => boolean
    ): [Kind<F, R, O, E, B>, Kind<F, R, O, E, B>] =>
      F.partitionMap(self, (b) => (predicate(b) ? Either.right(b) : Either.left(b)))
  )
