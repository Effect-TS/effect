import { HasURI, HKT, Kind, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <B>(fb: HKT<F, B>) => <A>(fa: HKT<F, A>) => HKT<F, readonly [A, B]>
}

export interface AssociativeBothK<F extends URIS> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <X, I, S, R, E, B>(
    fb: Kind<F, X, I, S, R, E, B>
  ) => <X1, I1, R1, E1, A>(
    fa: Kind<F, X1, I1, S, R1, E1, A>
  ) => Kind<F, X | X1, I & I1, S | S, R & R1, E | E1, readonly [A, B]>
}

export function makeAssociativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<AssociativeBothK<URI>, "URI" | "AssociativeBoth">) => AssociativeBothK<URI>
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
