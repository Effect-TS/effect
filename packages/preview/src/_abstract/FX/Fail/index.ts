import { HasConstrainedE, HasURI, HKT10, Kind, URIS } from "../../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface FailF<F> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E, S, SI, SO = SI>(
    e: E
  ) => HKT10<F, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export interface FailK<F extends URIS> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E, S, SI, SO = SI>(
    e: E
  ) => Kind<F, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export interface FailFE<F, E> extends HasConstrainedE<F, E> {
  readonly Fail: "Fail"
  readonly fail: <S, SI, SO = SI>(
    e: E
  ) => HKT10<F, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export interface FailKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Fail: "Fail"
  readonly fail: <S, SI, SO = SI>(
    e: E
  ) => Kind<F, never, never, SI, SO, never, unknown, S, unknown, E, never>
}

export function makeFail<URI extends URIS>(
  _: URI
): (_: Omit<FailK<URI>, "URI" | "Fail">) => FailK<URI>
export function makeFail<URI>(
  URI: URI
): (_: Omit<FailF<URI>, "URI" | "Fail">) => FailF<URI>
export function makeFail<URI>(
  URI: URI
): (_: Omit<FailF<URI>, "URI" | "Fail">) => FailF<URI> {
  return (_) => ({
    URI,
    Fail: "Fail",
    ..._
  })
}

export function makeFailE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<FailKE<URI, E>, "URI" | "Fail" | "E">) => FailKE<URI, E>
export function makeFailE<URI>(
  URI: URI
): <E>() => (_: Omit<FailFE<URI, E>, "URI" | "Fail" | "E">) => FailFE<URI, E>
export function makeFailE<URI>(
  URI: URI
): <E>() => (_: Omit<FailFE<URI, E>, "URI" | "Fail" | "E">) => FailFE<URI, E> {
  return () => (_) => ({
    URI,
    Fail: "Fail",
    E: undefined as any,
    ..._
  })
}
