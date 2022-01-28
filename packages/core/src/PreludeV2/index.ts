import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import type * as HKT from "./HKT"

export * from "./HKT"
export * as FX from "./FX"

/**
 * An associative binary operator that combines two values of types `F<A>`
 * and `F<B>` to produce an `F<[A, B]>`.
 */
export interface AssociativeBoth<F extends HKT.HKT> {
  both: <X2, I2, S2, R2, E2, B>(
    fb: HKT.Kind<F, X2, I2, S2, R2, E2, B>
  ) => <X, I, S, R, E, A>(
    fa: HKT.Kind<F, X, I, S, R, E, A>
  ) => HKT.Kind<F, X2, I2, S2, R2 & R, E2 | E, Tp.Tuple<[A, B]>>
}

export interface Any<F extends HKT.HKT> {
  readonly any: <X = any, I = any, S = any, R = unknown, E = never>() => HKT.Kind<
    F,
    X,
    I,
    S,
    R,
    E,
    unknown
  >
}

/**
 * Given a function A => B, go from F<A> to F<B>
 *
 * ```typescript
 * declare const user: User
 * const userName: Option<string> = pipe(O.some(user), O.map(user => user.username))
 * ```
 */
export interface Covariant<F extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <X = any, I = any, S = any, R = unknown, E = never>(
    fa: HKT.Kind<F, X, I, S, R, E, A>
  ) => HKT.Kind<F, X, I, S, R, E, B>
}

/**
 * Describes a type that can be "flattened" in an
 * associative way.
 *
 * ```typescript
 * declare const user: User
 * const userName: Option<string> = pipe(
 *  O.some(user),
 *  O.map(user => user.email), // Option<Option<string>>
 *  O.flatten // Option<string>
 * )
 * ```
 */
export interface AssociativeFlatten<F extends HKT.HKT> {
  readonly flatten: <X, I, S, R, E, A, X2, I2, S2, R2, E2>(
    ffa: HKT.Kind<F, X2, I2, S2, R2, E2, HKT.Kind<F, X, I, S, R, E, A>>
  ) => HKT.Kind<F, X2, I2, S2, R2 & R, E2 | E, A>
}

export type IdentityFlatten<F extends HKT.HKT> = AssociativeFlatten<F> & Any<F>

/**
 * A binary operator that combines two values of types `F<A>` and `F<B>` to
 * produce an `F<[A, B]>` with an identity.
 */
export interface IdentityBoth<F extends HKT.HKT> extends AssociativeBoth<F>, Any<F> {}

export interface Applicative<F extends HKT.HKT> extends IdentityBoth<F>, Covariant<F> {}

export interface Monad<F extends HKT.HKT> extends IdentityFlatten<F>, Covariant<F> {}
