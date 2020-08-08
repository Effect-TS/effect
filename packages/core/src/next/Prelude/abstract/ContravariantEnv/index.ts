import { HKT6, Kind, URIS } from "../HKT"

export interface ContravariantEnvF<F> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <X, In, S, E, A>(fa: HKT6<F, X, In, S, R, E, A>) => HKT6<F, X, In, S, R0, E, A>
}

export interface ContravariantEnvK<F extends URIS> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <X, In, S, E, A>(fa: Kind<F, X, In, S, R, E, A>) => Kind<F, X, In, S, R0, E, A>
}

export function makeContravariantEnv<URI extends URIS>(
  _: URI
): (
  _: Omit<ContravariantEnvK<URI>, "URI" | "ContravariantEnv">
) => ContravariantEnvK<URI>
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
