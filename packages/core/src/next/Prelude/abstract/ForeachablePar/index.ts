import {
  CovariantF,
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
export interface ForeachableParF<F> extends CovariantF<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (as: Iterable<A>) => HKT<F, readonly B[]>
}

export interface ForeachablePar1<F extends URIS> extends Covariant1<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (as: Iterable<A>) => HKT<F, readonly B[]>
}

export interface ForeachablePar2<F extends URIS2> extends Covariant2<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (as: Iterable<A>) => Kind2<F, E, readonly B[]>
}

export interface ForeachablePar3<F extends URIS3> extends Covariant3<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (as: Iterable<A>) => Kind3<F, R, E, readonly B[]>
}

export interface ForeachablePar4<F extends URIS4> extends Covariant4<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (as: Iterable<A>) => Kind4<F, S, R, E, readonly B[]>
}

export interface ForeachablePar5<F extends URIS5> extends Covariant5<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <X, S, R, E, A, B>(
    f: (a: A) => Kind5<F, X, S, R, E, B>
  ) => (as: Iterable<A>) => Kind5<F, X, S, R, E, readonly B[]>
}

export interface ForeachablePar6<F extends URIS6> extends Covariant6<F> {
  readonly ForeachablePar: "ForeachablePar"
  readonly foreachPar: <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<F, Y, X, S, R, E, B>
  ) => (as: Iterable<A>) => Kind6<F, unknown, X, S, R, E, readonly B[]>
}

export function makeForeachablePar<URI extends URIS>(
  _: URI
): (_: Omit<ForeachablePar1<URI>, "URI" | "ForeachablePar">) => ForeachablePar1<URI>
export function makeForeachablePar<URI extends URIS2>(
  _: URI
): (_: Omit<ForeachablePar2<URI>, "URI" | "ForeachablePar">) => ForeachablePar2<URI>
export function makeForeachablePar<URI extends URIS3>(
  _: URI
): (_: Omit<ForeachablePar3<URI>, "URI" | "ForeachablePar">) => ForeachablePar3<URI>
export function makeForeachablePar<URI extends URIS4>(
  _: URI
): (_: Omit<ForeachablePar4<URI>, "URI" | "ForeachablePar">) => ForeachablePar4<URI>
export function makeForeachablePar<URI extends URIS5>(
  _: URI
): (_: Omit<ForeachablePar5<URI>, "URI" | "ForeachablePar">) => ForeachablePar5<URI>
export function makeForeachablePar<URI extends URIS6>(
  _: URI
): (_: Omit<ForeachablePar6<URI>, "URI" | "ForeachablePar">) => ForeachablePar6<URI>
export function makeForeachablePar<URI>(
  URI: URI
): (_: Omit<ForeachableParF<URI>, "URI" | "ForeachablePar">) => ForeachableParF<URI> {
  return (_) => ({
    URI,
    ForeachablePar: "ForeachablePar",
    ..._
  })
}
