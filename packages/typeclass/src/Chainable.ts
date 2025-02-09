/**
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { NoInfer } from "effect/Types"
import type { Covariant } from "./Covariant.js"
import type { FlatMap } from "./FlatMap.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Chainable<F extends TypeLambda> extends FlatMap<F>, Covariant<F> {}

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @category combining
 * @since 0.24.0
 */
export const zipLeft = <F extends TypeLambda>(F: Chainable<F>): {
  <R2, O2, E2, _>(
    that: Kind<F, R2, O2, E2, _>
  ): <R1, O1, E1, A>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, A>
  <R1, O1, E1, A, R2, O2, E2, _>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, _>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A>
} =>
  dual(2, <R1, O1, E1, A, R2, O2, E2, _>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, _>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A> => tap(F)(self, () => that))

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @since 0.24.0
 */
export const tap = <F extends TypeLambda>(F: Chainable<F>): {
  <A, R2, O2, E2, _>(
    f: (a: A) => Kind<F, R2, O2, E2, _>
  ): <R1, O1, E1>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, A>
  <R1, O1, E1, A, R2, O2, E2, _>(
    self: Kind<F, R1, O1, E1, A>,
    f: (a: A) => Kind<F, R2, O2, E2, _>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A>
} =>
  dual(
    2,
    <R1, O1, E1, A, R2, O2, E2, _>(
      self: Kind<F, R1, O1, E1, A>,
      f: (a: A) => Kind<F, R2, O2, E2, _>
    ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A> => F.flatMap(self, (a) => F.map(f(a), () => a))
  )

/**
 * @category do notation
 * @since 0.24.0
 */
export const bind = <F extends TypeLambda>(F: Chainable<F>): {
  <N extends string, A extends object, R2, O2, E2, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Kind<F, R2, O2, E2, B>
  ): <R1, O1, E1>(
    self: Kind<F, R1, O1, E1, A>
  ) => Kind<F, R1 & R2, O1 | O2, E1 | E2, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
  <R1, O1, E1, A extends object, N extends string, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
} =>
  dual(3, <R1, O1, E1, A, N extends string, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, { [K in keyof A | N]: K extends keyof A ? A[K] : B }> =>
    F.flatMap(self, (a) => F.map(f(a), (b) => Object.assign({}, a, { [name]: b }) as any)))
