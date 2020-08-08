import { HasURI, HKT, Kind6, URIS6 } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, readonly [A, B]>
}

export interface AssociativeBoth6<F extends URIS6> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <X, I, S, R, E, B>(
    fb: Kind6<F, X, I, S, R, E, B>
  ) => <X1, I1, R1, E1, A>(
    fa: Kind6<F, X1, I1, S, R1, E1, A>
  ) => Kind6<F, X | X1, I & I1, S | S, R & R1, E | E1, readonly [A, B]>
}

export function makeAssociativeBoth<URI extends URIS6>(
  _: URI
): (_: Omit<AssociativeBoth6<URI>, "URI" | "AssociativeBoth">) => AssociativeBoth6<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (
  _: Omit<AssociativeBothF<URI>, "URI" | "AssociativeBoth">
) => AssociativeBothF<URI> {
  return (_) => ({
    URI,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}
