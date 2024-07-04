/**
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { Invariant } from "./Invariant.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Contravariant<F extends TypeLambda> extends Invariant<F> {
  readonly contramap: {
    <B, A>(f: (b: B) => A): <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (b: B) => A): Kind<F, R, O, E, B>
  }
}

/**
 * Composing two contravariant functors yields a Covariant functor.
 *
 * Returns a default binary `map` composition.
 *
 * @since 0.24.0
 */
export const contramapComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Contravariant<F>,
  G: Contravariant<G>
) =>
<FR, FO, FE, GR, GO, GE, A, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  f: (a: A) => B
): Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, B>> => F.contramap(self, G.contramap(f))

/**
 * Returns a default `imap` implementation.
 *
 * @since 0.24.0
 */
export const imap = <F extends TypeLambda>(
  contramap: <R, O, E, A, B>(
    self: Kind<F, R, O, E, A>,
    f: (b: B) => A
  ) => Kind<F, R, O, E, B>
): Invariant<F>["imap"] => dual(3, (self, _, from) => contramap(self, from))
