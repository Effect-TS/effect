/**
 * @since 1.0.0
 */
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Of<F extends TypeLambda> extends TypeClass<F> {
  readonly of: <A>(a: A) => Kind<F, unknown, never, never, A>
}

/**
 * Returns a default `of` composition.
 *
 * @since 1.0.0
 */
export const ofComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Of<F>,
  G: Of<G>
) =>
<A>(a: A): Kind<F, unknown, never, never, Kind<G, unknown, never, never, A>> => F.of(G.of(a))

/**
 * @since 1.0.0
 */
export const unit = <F extends TypeLambda>(
  F: Of<F>
): <R = unknown, O = never, E = never>() => Kind<F, R, O, E, void> =>
() => F.of<void>(undefined)

/**
 * @category do notation
 * @since 1.0.0
 */
export const Do = <F extends TypeLambda>(
  F: Of<F>
): <R = unknown, O = never, E = never>() => Kind<F, R, O, E, {}> =>
() => F.of({})
