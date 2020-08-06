import { pipe } from "../../../Function"
import {
  AssociativeBoth,
  AssociativeBoth1,
  AssociativeBoth2,
  AssociativeBoth3,
  AssociativeBoth4,
  AssociativeBoth5,
  AssociativeBoth6
} from "../AssociativeBoth"
import {
  Covariant,
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6
} from "../Covariant"
import {
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface IdentityBoth<F> extends AssociativeBoth<F> {
  readonly any: () => HKT<F, unknown>
}

export interface IdentityBoth1<F extends URIS> extends AssociativeBoth1<F> {
  readonly any: () => Kind<F, unknown>
}

export interface IdentityBoth2<F extends URIS2> extends AssociativeBoth2<F> {
  readonly any: <E>() => Kind2<F, E, unknown>
}

export interface IdentityBoth3<F extends URIS3> extends AssociativeBoth3<F> {
  readonly any: <R, E>() => Kind3<F, R, E, unknown>
}

export interface IdentityBoth4<F extends URIS4> extends AssociativeBoth4<F> {
  readonly any: <S, R, E>() => Kind4<F, S, R, E, unknown>
}

export interface IdentityBoth5<F extends URIS5> extends AssociativeBoth5<F> {
  readonly any: <X, S, R, E>() => Kind5<F, X, S, R, E, unknown>
}

export interface IdentityBoth6<F extends URIS6> extends AssociativeBoth6<F> {
  readonly any: <Y, X, S, R, E>() => Kind6<F, Y, X, S, R, E, unknown>
}

export function succeed<F extends URIS>(
  F: IdentityBoth1<F> & Covariant1<F>
): <A>(a: A) => Kind<F, A>
export function succeed<F extends URIS2>(
  F: IdentityBoth2<F> & Covariant2<F>
): <E, A>(a: A) => Kind2<F, E, A>
export function succeed<F extends URIS3>(
  F: IdentityBoth3<F> & Covariant3<F>
): <R, E, A>(a: A) => Kind3<F, R, E, A>
export function succeed<F extends URIS4>(
  F: IdentityBoth4<F> & Covariant4<F>
): <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
export function succeed<F extends URIS5>(
  F: IdentityBoth5<F> & Covariant5<F>
): <X, S, R, E, A>(a: A) => Kind5<F, X, S, R, E, A>
export function succeed<F extends URIS6>(
  F: IdentityBoth6<F> & Covariant6<F>
): <Y, X, S, R, E, A>(a: A) => Kind6<F, Y, X, S, R, E, A>
export function succeed<F>(F: IdentityBoth<F> & Covariant<F>): <A>(a: A) => HKT<F, A>
export function succeed<F>(F: IdentityBoth<F> & Covariant<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}
