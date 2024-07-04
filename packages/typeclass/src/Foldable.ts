/**
 * @since 0.24.0
 */

import { dual, identity } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"
import type { Coproduct } from "./Coproduct.js"
import type { Monad } from "./Monad.js"
import type { Monoid } from "./Monoid.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Foldable<F extends TypeLambda> extends TypeClass<F> {
  readonly reduce: {
    <A, B>(b: B, f: (b: B, a: A) => B): <R, O, E>(self: Kind<F, R, O, E, A>) => B
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, b: B, f: (b: B, a: A) => B): B
  }
}

/**
 * Returns a default ternary `reduce` composition.
 *
 * @since 0.24.0
 */
export const reduceComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Foldable<F>,
  G: Foldable<G>
) =>
<FR, FO, FE, GR, GO, GE, A, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  b: B,
  f: (b: B, a: A) => B
): B => F.reduce(self, b, (b, ga) => G.reduce(ga, b, f))

/**
 * @since 0.24.0
 */
export const toArrayMap = <F extends TypeLambda>(
  F: Foldable<F>
): {
  <A, B>(f: (a: A) => B): <R, O, E>(self: Kind<F, R, O, E, A>) => Array<B>
  <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B): Array<B>
} =>
  dual(
    2,
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B): Array<B> =>
      F.reduce(self, [], (out: Array<B>, a) => [...out, f(a)])
  )

/**
 * @since 0.24.0
 */
export const toArray = <F extends TypeLambda>(
  F: Foldable<F>
): <R, O, E, A>(self: Kind<F, R, O, E, A>) => Array<A> => toArrayMap(F)(identity)

/**
 * @since 0.24.0
 */
export const combineMap = <F extends TypeLambda>(F: Foldable<F>) =>
<M>(M: Monoid<M>): {
  <A>(f: (a: A) => M): <R, O, E>(self: Kind<F, R, O, E, A>) => M
  <R, O, E, A>(self: Kind<F, R, O, E, A>, f: (a: A) => M): M
} =>
  dual(
    2,
    <R, O, E, A>(self: Kind<F, R, O, E, A>, f: (a: A) => M): M => F.reduce(self, M.empty, (m, a) => M.combine(m, f(a)))
  )

/**
 * @since 0.24.0
 */
export const reduceKind = <F extends TypeLambda>(F: Foldable<F>) =>
<G extends TypeLambda>(G: Monad<G>): {
  <B, A, R, O, E>(
    b: B,
    f: (b: B, a: A) => Kind<G, R, O, E, B>
  ): <FR, FO, FE>(self: Kind<F, FR, FO, FE, A>) => Kind<G, R, O, E, B>
  <FR, FO, FE, A, B, R, O, E>(
    self: Kind<F, FR, FO, FE, A>,
    b: B,
    f: (b: B, a: A) => Kind<G, R, O, E, B>
  ): Kind<G, R, O, E, B>
} =>
  dual(3, <FR, FO, FE, A, B, R, O, E>(
    self: Kind<F, FR, FO, FE, A>,
    b: B,
    f: (b: B, a: A) => Kind<G, R, O, E, B>
  ): Kind<G, R, O, E, B> =>
    F.reduce(
      self,
      G.of(b),
      (gb: Kind<G, R, O, E, B>, a) => G.flatMap(gb, (b) => f(b, a))
    ))

/**
 * @since 0.24.0
 */
export const coproductMapKind = <F extends TypeLambda>(F: Foldable<F>) =>
<G extends TypeLambda>(G: Coproduct<G>): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<G, R, O, E, B>
  ): <FR, FO, FE>(self: Kind<F, FR, FO, FE, A>) => Kind<G, R, O, E, B>
  <FR, FO, FE, A, R, O, E, B>(
    self: Kind<F, FR, FO, FE, A>,
    f: (a: A) => Kind<G, R, O, E, B>
  ): Kind<G, R, O, E, B>
} =>
  dual(2, <FR, FO, FE, A, R, O, E, B>(
    self: Kind<F, FR, FO, FE, A>,
    f: (a: A) => Kind<G, R, O, E, B>
  ): Kind<G, R, O, E, B> => F.reduce(self, G.zero(), (gb: Kind<G, R, O, E, B>, a) => G.coproduct(gb, f(a))))
