import * as E from "../../../../Either"
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
export interface AssociativeEither<F> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, E.Either<A, B>>
}

export interface AssociativeEither1<F extends URIS> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <B>(fb: Kind<F, B>) => <A>(fa: Kind<F, A>) => Kind<F, E.Either<A, B>>
}

export interface AssociativeEither2<F extends URIS2> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <E, B>(
    fb: Kind2<F, E, B>
  ) => <A>(fa: Kind2<F, E, A>) => Kind2<F, E, E.Either<A, B>>
}

export interface AssociativeEither3<F extends URIS3> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <R, E, B>(
    fb: Kind3<F, R, E, B>
  ) => <A>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, E.Either<A, B>>
}

export interface AssociativeEither4<F extends URIS4> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <S, R, E, B>(
    fb: Kind4<F, S, R, E, B>
  ) => <A>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, E.Either<A, B>>
}

export interface AssociativeEither5<F extends URIS5> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <X, S, R, E, B>(
    fb: Kind5<F, X, S, R, E, B>
  ) => <A>(fa: Kind5<F, X, S, R, E, A>) => Kind5<F, X, S, R, E, E.Either<A, B>>
}

export interface AssociativeEither6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <Y, X, S, R, E, B>(
    fb: Kind6<F, Y, X, S, R, E, B>
  ) => <A>(fa: Kind6<F, Y, X, S, R, E, A>) => Kind6<F, Y, X, S, R, E, E.Either<A, B>>
}

export function makeAssociativeEither<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeEither1<URI>, "URI" | "AssociativeEither">
) => AssociativeEither1<URI>
export function makeAssociativeEither<URI extends URIS2>(
  _: URI
): (
  _: Omit<AssociativeEither2<URI>, "URI" | "AssociativeEither">
) => AssociativeEither2<URI>
export function makeAssociativeEither<URI extends URIS3>(
  _: URI
): (
  _: Omit<AssociativeEither3<URI>, "URI" | "AssociativeEither">
) => AssociativeEither3<URI>
export function makeAssociativeEither<URI extends URIS4>(
  _: URI
): (
  _: Omit<AssociativeEither4<URI>, "URI" | "AssociativeEither">
) => AssociativeEither4<URI>
export function makeAssociativeEither<URI extends URIS5>(
  _: URI
): (
  _: Omit<AssociativeEither5<URI>, "URI" | "AssociativeEither">
) => AssociativeEither5<URI>
export function makeAssociativeEither<URI extends URIS6>(
  _: URI
): (
  _: Omit<AssociativeEither6<URI>, "URI" | "AssociativeEither">
) => AssociativeEither6<URI>
export function makeAssociativeEither<URI>(
  URI: URI
): (
  _: Omit<AssociativeEither<URI>, "URI" | "AssociativeEither">
) => AssociativeEither<URI> {
  return (_) => ({
    URI,
    AssociativeEither: "AssociativeEither",
    ..._
  })
}
