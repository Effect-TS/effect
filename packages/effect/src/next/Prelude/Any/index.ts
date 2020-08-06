import { pipe } from "../../../Function"
import {
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6,
  Covariant
} from "../Covariant"
import {
  HasURI,
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
export interface Any<F> extends HasURI<F> {
  readonly any: () => HKT<F, unknown>
}

export interface Any1<F extends URIS> extends HasURI<F> {
  readonly any: () => Kind<F, unknown>
}

export interface Any2<F extends URIS2> extends HasURI<F> {
  readonly any: <E>() => Kind2<F, E, unknown>
}

export interface Any3<F extends URIS3> extends HasURI<F> {
  readonly any: <R, E>() => Kind3<F, R, E, unknown>
}

export interface Any4<F extends URIS4> extends HasURI<F> {
  readonly any: <S, R, E>() => Kind4<F, S, R, E, unknown>
}

export interface Any5<F extends URIS5> extends HasURI<F> {
  readonly any: <X, S, R, E>() => Kind5<F, X, S, R, E, unknown>
}

export interface Any6<F extends URIS6> extends HasURI<F> {
  readonly any: <Y, X, S, R, E>() => Kind6<F, Y, X, S, R, E, unknown>
}

export function succeed<F extends URIS>(
  F: Any1<F> & Covariant1<F>
): <A>(a: A) => Kind<F, A>
export function succeed<F extends URIS2>(
  F: Any2<F> & Covariant2<F>
): <E, A>(a: A) => Kind2<F, E, A>
export function succeed<F extends URIS3>(
  F: Any3<F> & Covariant3<F>
): <R, E, A>(a: A) => Kind3<F, R, E, A>
export function succeed<F extends URIS4>(
  F: Any4<F> & Covariant4<F>
): <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
export function succeed<F extends URIS5>(
  F: Any5<F> & Covariant5<F>
): <X, S, R, E, A>(a: A) => Kind5<F, X, S, R, E, A>
export function succeed<F extends URIS6>(
  F: Any6<F> & Covariant6<F>
): <Y, X, S, R, E, A>(a: A) => Kind6<F, Y, X, S, R, E, A>
export function succeed<F>(F: Any<F> & Covariant<F>): <A>(a: A) => HKT<F, A>
export function succeed<F>(F: Any<F> & Covariant<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}
