/**
 * @since 0.24.0
 */
import { dual, identity } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 0.24.0
 */
export interface FlatMap<F extends TypeLambda> extends TypeClass<F> {
  readonly flatMap: {
    <A, R2, O2, E2, B>(
      f: (a: A) => Kind<F, R2, O2, E2, B>
    ): <R1, O1, E1>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O1 | O2, E1 | E2, B>
    <R1, O1, E1, A, R2, O2, E2, B>(
      self: Kind<F, R1, O1, E1, A>,
      f: (a: A) => Kind<F, R2, O2, E2, B>
    ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B>
  }
}

/**
 * @since 0.24.0
 */
export const flatten = <F extends TypeLambda>(F: FlatMap<F>) =>
<R2, O2, E2, R1, O1, E1, A>(
  self: Kind<F, R2, O2, E2, Kind<F, R1, O1, E1, A>>
): Kind<F, R1 & R2, O1 | O2, E1 | E2, A> => F.flatMap(self, identity)

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @since 0.24.0
 */
export const zipRight = <F extends TypeLambda>(F: FlatMap<F>): {
  <R2, O2, E2, B>(
    that: Kind<F, R2, O2, E2, B>
  ): <R1, O1, E1, _>(self: Kind<F, R1, O1, E1, _>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, B>
  <R1, O1, E1, _, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, _>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B>
} =>
  dual(2, <R1, O1, E1, _, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, _>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B> => F.flatMap(self, () => that))

/**
 * @since 0.24.0
 */
export const composeK = <F extends TypeLambda>(
  F: FlatMap<F>
): {
  <B, R2, O2, E2, C>(
    bfc: (b: B) => Kind<F, R2, O2, E2, C>
  ): <A, R1, O1, E1>(
    afb: (a: A) => Kind<F, R1, O1, E1, B>
  ) => (a: A) => Kind<F, R1 & R2, O2 | O1, E2 | E1, C>
  <A, R1, O1, E1, B, R2, O2, E2, C>(
    afb: (a: A) => Kind<F, R1, O1, E1, B>,
    bfc: (b: B) => Kind<F, R2, O2, E2, C>
  ): (a: A) => Kind<F, R1 & R2, O1 | O2, E1 | E2, C>
} =>
  dual(
    2,
    <A, R1, O1, E1, B, R2, O2, E2, C>(
      afb: (a: A) => Kind<F, R1, O1, E1, B>,
      bfc: (b: B) => Kind<F, R2, O2, E2, C>
    ): (a: A) => Kind<F, R1 & R2, O1 | O2, E1 | E2, C> =>
    (a) => F.flatMap(afb(a), bfc)
  )
