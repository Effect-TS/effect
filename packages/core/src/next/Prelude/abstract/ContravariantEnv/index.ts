import { HKT3, Kind3, Kind4, Kind5, Kind6, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

export interface ContravariantEnvF<F> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A>
}

export interface ContravariantEnv3<F extends URIS3> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <E, A>(fa: Kind3<F, R, E, A>) => Kind3<F, R0, E, A>
}

export interface ContravariantEnv4<F extends URIS4> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <S, E, A>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R0, E, A>
}

export interface ContravariantEnv5<F extends URIS5> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <In, S, E, A>(fa: Kind5<F, In, S, R, E, A>) => Kind5<F, In, S, R0, E, A>
}

export interface ContravariantEnv6<F extends URIS6> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <X, In, S, E, A>(fa: Kind6<F, X, In, S, R, E, A>) => Kind6<F, X, In, S, R0, E, A>
}

export function makeContravariantEnv<URI extends URIS3>(
  _: URI
): (
  _: Omit<ContravariantEnv3<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnv3<URI>
export function makeContravariantEnv<URI extends URIS4>(
  _: URI
): (
  _: Omit<ContravariantEnv4<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnv4<URI>
export function makeContravariantEnv<URI extends URIS5>(
  _: URI
): (
  _: Omit<ContravariantEnv5<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnv5<URI>
export function makeContravariantEnv<URI extends URIS6>(
  _: URI
): (
  _: Omit<ContravariantEnv6<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnv6<URI>
export function makeContravariantEnv<URI>(
  URI: URI
): (
  _: Omit<ContravariantEnvF<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnvF<URI> {
  return (_) => ({
    URI,
    ContravariantEnv: "ContravariantEnv",
    ..._
  })
}
