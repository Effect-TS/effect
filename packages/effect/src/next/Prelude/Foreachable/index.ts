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
export interface Foreachable<F> extends Covariant<F> {
  readonly foreach: <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (as: Iterable<A>) => HKT<F, readonly B[]>
}

export interface Foreachable1<F extends URIS> extends Covariant1<F> {
  readonly foreach: <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (as: Iterable<A>) => HKT<F, readonly B[]>
}

export interface Foreachable2<F extends URIS2> extends Covariant2<F> {
  readonly foreach: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (as: Iterable<A>) => Kind2<F, E, readonly B[]>
}

export interface Foreachable3<F extends URIS3> extends Covariant3<F> {
  readonly foreach: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (as: Iterable<A>) => Kind3<F, R, E, readonly B[]>
}

export interface Foreachable4<F extends URIS4> extends Covariant4<F> {
  readonly foreach: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (as: Iterable<A>) => Kind4<F, S, R, E, readonly B[]>
}

export interface Foreachable5<F extends URIS5> extends Covariant5<F> {
  readonly foreach: <X, S, R, E, A, B>(
    f: (a: A) => Kind5<F, X, S, R, E, B>
  ) => (as: Iterable<A>) => Kind5<F, X, S, R, E, readonly B[]>
}

export interface Foreachable6<F extends URIS6> extends Covariant6<F> {
  readonly foreach: <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<F, Y, X, S, R, E, B>
  ) => (as: Iterable<A>) => Kind6<F, Y, X, S, R, E, readonly B[]>
}
