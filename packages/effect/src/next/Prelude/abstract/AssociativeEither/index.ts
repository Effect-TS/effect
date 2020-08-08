import * as E from "../../../../Either"
import { HasURI, HKT, Kind6, URIS6 } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface AssociativeEitherF<F> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, E.Either<A, B>>
}

export interface AssociativeEither6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeEither: "AssociativeEither"
  readonly either: <X, I, S, R, E, B>(
    fb: Kind6<F, X, I, S, R, E, B>
  ) => <X1, I1, R1, E1, A>(
    fa: Kind6<F, X, I1, S, R1, E1, A>
  ) => Kind6<F, X | X1, I & I1, S, R & R1, E | E1, E.Either<A, B>>
}

export function makeAssociativeEither<URI extends URIS6>(
  _: URI
): (
  _: Omit<AssociativeEither6<URI>, "URI" | "AssociativeEither">
) => AssociativeEither6<URI>
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
