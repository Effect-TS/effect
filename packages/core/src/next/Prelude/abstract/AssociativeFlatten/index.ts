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
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeFlatten<F> extends HasURI<F> {
  readonly flatten: <A>(fb: HKT<F, HKT<F, A>>) => HKT<F, A>
}

export interface AssociativeFlatten1<F extends URIS> extends HasURI<F> {
  readonly flatten: <A>(fb: Kind<F, Kind<F, A>>) => Kind<F, A>
}

export interface AssociativeFlatten2<F extends URIS2> extends HasURI<F> {
  readonly flatten: <E, A>(fb: Kind2<F, E, Kind2<F, E, A>>) => Kind2<F, E, A>
}

export interface AssociativeFlatten3<F extends URIS3> extends HasURI<F> {
  readonly flatten: <R, E, A>(
    fb: Kind3<F, R, E, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, A>
}

export interface AssociativeFlatten4<F extends URIS4> extends HasURI<F> {
  readonly flatten: <S, R, E, A>(
    fb: Kind4<F, S, R, E, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, A>
}

export interface AssociativeFlatten5<F extends URIS5> extends HasURI<F> {
  readonly flatten: <X, S, R, E, A>(
    fb: Kind5<F, X, S, R, E, Kind5<F, X, S, R, E, A>>
  ) => Kind5<F, X, S, R, E, A>
}

export interface AssociativeFlatten6<F extends URIS6> extends HasURI<F> {
  readonly flatten: <Y, X, S, R, E, A>(
    fb: Kind6<F, Y, X, S, R, E, Kind6<F, Y, X, S, R, E, A>>
  ) => Kind6<F, Y, X, S, R, E, A>
}
