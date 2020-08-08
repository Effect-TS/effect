import { HasURI, HKT2, Kind, URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface FailF<F> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E>(e: E) => HKT2<F, E, never>
}

export interface FailK<F extends URIS> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <S, E>(e: E) => Kind<F, never, unknown, S, unknown, E, never>
}

export function makeFail<URI extends URIS>(
  _: URI
): (_: Omit<FailK<URI>, "URI" | "Fail">) => FailK<URI>
export function makeFail<URI>(
  URI: URI
): (_: Omit<FailF<URI>, "URI" | "Fail">) => FailF<URI> {
  return (_) => ({
    URI,
    Fail: "Fail",
    ..._
  })
}
