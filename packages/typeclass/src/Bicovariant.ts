/**
 * @since 0.24.0
 */
import { dual, identity } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"
import type { Covariant } from "./Covariant.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Bicovariant<F extends TypeLambda> extends TypeClass<F> {
  readonly bimap: {
    <E1, E2, A, B>(
      f: (e: E1) => E2,
      g: (a: A) => B
    ): <R, O>(self: Kind<F, R, O, E1, A>) => Kind<F, R, O, E2, B>
    <R, O, E1, A, E2, B>(
      self: Kind<F, R, O, E1, A>,
      f: (e: E1) => E2,
      g: (a: A) => B
    ): Kind<F, R, O, E2, B>
  }
}

/**
 * Returns a default ternary `bimap` composition.
 *
 * @since 0.24.0
 */
export const bimapComposition = <F extends TypeLambda, G extends TypeLambda>(
  CovariantF: Covariant<F>,
  BicovariantG: Bicovariant<G>
) =>
<FR, FO, FE, GR, GO, E1, A, E2, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, E1, A>>,
  f: (e: E1) => E2,
  g: (a: A) => B
): Kind<F, FR, FO, FE, Kind<G, GR, GO, E2, B>> => CovariantF.map(self, BicovariantG.bimap(f, g))

/**
 * Returns a default `mapLeft` implementation.
 *
 * @since 0.24.0
 */
export const mapLeft = <F extends TypeLambda>(
  F: Bicovariant<F>
): {
  <E, G>(f: (e: E) => G): <R, O, A>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, G, A>
  <R, O, E, A, G>(self: Kind<F, R, O, E, A>, f: (e: E) => G): Kind<F, R, O, G, A>
} =>
  dual(
    2,
    <R, O, E, A, G>(self: Kind<F, R, O, E, A>, f: (e: E) => G): Kind<F, R, O, G, A> => F.bimap(self, f, identity)
  )

/**
 * Returns a default `map` implementation.
 *
 * @since 0.24.0
 */
export const map = <F extends TypeLambda>(
  F: Bicovariant<F>
): Covariant<F>["map"] =>
  dual(
    2,
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B): Kind<F, R, O, E, B> => F.bimap(self, identity, f)
  )
