import { HasURI, HKTFix, KindFix, URIS } from "../../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface FailF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Fail: "Fail"
  readonly fail: <E, S, SI, SO = SI>(
    e: E
  ) => HKTFix<F, Fix, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export interface FailK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Fail: "Fail"
  readonly fail: <E, S, SI, SO = SI>(
    e: E
  ) => KindFix<F, Fix, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export function makeFail<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<FailK<URI, Fix>, "URI" | "Fix" | "Fail">) => FailK<URI, Fix>
export function makeFail<URI, Fix = any>(
  URI: URI
): (_: Omit<FailF<URI, Fix>, "URI" | "Fix" | "Fail">) => FailF<URI, Fix>
export function makeFail<URI, Fix = any>(
  URI: URI
): (_: Omit<FailF<URI, Fix>, "URI" | "Fix" | "Fail">) => FailF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Fail: "Fail",
    ..._
  })
}
