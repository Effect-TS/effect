/**
 * @since 0.24.0
 */
import { dual, identity } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"
import type { Applicative } from "./Applicative.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Traversable<T extends TypeLambda> extends TypeClass<T> {
  readonly traverse: <F extends TypeLambda>(
    F: Applicative<F>
  ) => {
    <A, R, O, E, B>(
      f: (a: A) => Kind<F, R, O, E, B>
    ): <TR, TO, TE>(self: Kind<T, TR, TO, TE, A>) => Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
    <TR, TO, TE, A, R, O, E, B>(
      self: Kind<T, TR, TO, TE, A>,
      f: (a: A) => Kind<F, R, O, E, B>
    ): Kind<F, R, O, E, Kind<T, TR, TO, TE, B>>
  }
}

/**
 * Returns a default binary `traverse` composition.
 *
 * @since 0.24.0
 */
export const traverseComposition = <T extends TypeLambda, G extends TypeLambda>(
  T: Traversable<T>,
  G: Traversable<G>
) =>
<F extends TypeLambda>(F: Applicative<F>) =>
<TR, TO, TE, GR, GO, GE, A, R, O, E, B>(
  self: Kind<T, TR, TO, TE, Kind<G, GR, GO, GE, A>>,
  f: (a: A) => Kind<F, R, O, E, B>
): Kind<F, R, O, E, Kind<T, TR, TO, TE, Kind<G, GR, GO, GE, B>>> => T.traverse(F)(self, G.traverse(F)(f))

/**
 * Returns a default `sequence` implementation.
 *
 * @since 0.24.0
 */
export const sequence =
  <T extends TypeLambda>(T: Traversable<T>) =>
  <F extends TypeLambda>(F: Applicative<F>) =>
  <TR, TO, TE, R, O, E, A>(
    self: Kind<T, TR, TO, TE, Kind<F, R, O, E, A>>
  ): Kind<F, R, O, E, Kind<T, TR, TO, TE, A>> => T.traverse(F)(self, identity)

/**
 * Given a function which returns a `F` effect, thread this effect
 * through the running of this function on all the values in `T`,
 * returning an `T<A>` in a `F` context, ignoring the values
 * returned by the provided function.
 *
 * @since 0.24.0
 */
export const traverseTap = <T extends TypeLambda>(T: Traversable<T>) =>
<F extends TypeLambda>(F: Applicative<F>): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<F, R, O, E, B>
  ): <TR, TO, TE>(self: Kind<T, TR, TO, TE, A>) => Kind<F, R, O, E, Kind<T, TR, TO, TE, A>>
  <TR, TO, TE, A, R, O, E, B>(
    self: Kind<T, TR, TO, TE, A>,
    f: (a: A) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Kind<T, TR, TO, TE, A>>
} =>
  dual(2, <TR, TO, TE, A, R, O, E, B>(
    self: Kind<T, TR, TO, TE, A>,
    f: (a: A) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Kind<T, TR, TO, TE, A>> => T.traverse(F)(self, (a) => F.map(f(a), () => a)))
