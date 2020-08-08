import { HKT3, Kind6, URIS6 } from "../HKT"

export interface ContravariantEnvF<F> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A>
}

export interface ContravariantEnv6<F extends URIS6> {
  readonly ContravariantEnv: "ContravariantEnv"
  readonly contramapEnv: <R0, R>(
    f: (r: R0) => R
  ) => <X, In, S, E, A>(fa: Kind6<F, X, In, S, R, E, A>) => Kind6<F, X, In, S, R0, E, A>
}

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
