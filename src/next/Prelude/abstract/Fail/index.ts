import {
  HasURI,
  HKT2,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
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
export interface FailF<F> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E>(e: E) => HKT2<F, E, never>
}

export interface Fail2<F extends URIS2> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E>(e: E) => Kind2<F, E, never>
}

export interface Fail3<F extends URIS3> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <E>(e: E) => Kind3<F, unknown, E, never>
}

export interface Fail4<F extends URIS4> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <S, E>(e: E) => Kind4<F, S, unknown, E, never>
}

export interface Fail5<F extends URIS5> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <S, E>(e: E) => Kind5<F, unknown, S, unknown, E, never>
}

export interface Fail6<F extends URIS6> extends HasURI<F> {
  readonly Fail: "Fail"
  readonly fail: <S, E>(e: E) => Kind6<F, never, unknown, S, unknown, E, never>
}

export function makeFail<URI extends URIS2>(
  _: URI
): (_: Omit<Fail2<URI>, "URI" | "Fail">) => Fail2<URI>
export function makeFail<URI extends URIS3>(
  _: URI
): (_: Omit<Fail3<URI>, "URI" | "Fail">) => Fail3<URI>
export function makeFail<URI extends URIS4>(
  _: URI
): (_: Omit<Fail4<URI>, "URI" | "Fail">) => Fail4<URI>
export function makeFail<URI extends URIS5>(
  _: URI
): (_: Omit<Fail5<URI>, "URI" | "Fail">) => Fail5<URI>
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
