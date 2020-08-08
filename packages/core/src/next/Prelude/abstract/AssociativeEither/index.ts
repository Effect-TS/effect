import * as E from "../../../../Either"
import { HasURI, HKT, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, E.Either<A, B>>
}

export interface AssociativeEitherK<F extends URIS> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <X, I, S, R, E, B>(
    fb: Kind<F, X, I, S, R, E, B>
  ) => <X1, I1, R1, E1, A>(
    fa: Kind<F, X, I1, S, R1, E1, A>
  ) => Kind<F, X | X1, I & I1, S, R & R1, E | E1, E.Either<A, B>>
}

export function makeAssociativeEither<URI extends URIS>(
  _: URI
): (
  _: Omit<AssociativeEitherK<URI>, "URI" | "AssociativeEither">
) => AssociativeEitherK<URI>
export function makeAssociativeEither<URI>(
  URI: URI
): (
  _: Omit<AssociativeEitherF<URI>, "URI" | "AssociativeEither">
) => AssociativeEitherF<URI> {
  return (_) => ({
    URI,
    AssociativeEither: "AssociativeEither",
    ..._
  })
}
