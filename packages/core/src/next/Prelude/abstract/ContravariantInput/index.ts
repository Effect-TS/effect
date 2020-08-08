import { HasURI, HKT6, Kind, URIS } from "../HKT"

export interface ContravariantInputF<F> extends HasURI<F> {
  readonly ContravariantInput: "ContravariantInput"
  readonly contramapInput: <In1, In>(
    f: (a: In1) => In
  ) => <X, S, R, E, A>(fa: HKT6<F, X, In, S, R, E, A>) => HKT6<F, X, In1, S, R, E, A>
}

export interface ContravariantInputK<F extends URIS> extends HasURI<F> {
  readonly ContravariantInput: "ContravariantInput"
  readonly contramapInput: <In1, In>(
    f: (a: In1) => In
  ) => <X, S, R, E, A>(fa: Kind<F, X, In, S, R, E, A>) => Kind<F, X, In1, S, R, E, A>
}

export function makeContravariantInput<URI extends URIS>(
  _: URI
): (
  _: Omit<ContravariantInputK<URI>, "URI" | "ContravariantInput">
) => ContravariantInputK<URI>
export function makeContravariantInput<URI>(
  URI: URI
): (
  _: Omit<ContravariantInputF<URI>, "URI" | "ContravariantInput">
) => ContravariantInputF<URI>
export function makeContravariantInput<URI>(
  URI: URI
): (
  _: Omit<ContravariantInputF<URI>, "URI" | "ContravariantInput">
) => ContravariantInputF<URI> {
  return (_) => ({
    URI,
    ContravariantInput: "ContravariantInput",
    ..._
  })
}
