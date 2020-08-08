import { HasURI, HKT2, Kind6, URIS6 } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface FailF<F> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E>(e: E) => HKT2<F, E, never>
}

export interface Fail6<F extends URIS6> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <S, E>(e: E) => Kind6<F, never, unknown, S, unknown, E, never>
}

export function makeFail<URI extends URIS6>(
  _: URI
): (_: Omit<Fail6<URI>, "URI" | "Fail">) => Fail6<URI>
export function makeFail<URI>(
  URI: URI
): (_: Omit<FailF<URI>, "URI" | "Fail">) => FailF<URI> {
  return (_) => ({
    URI,
    Fail: "Fail",
    ..._
  })
}
