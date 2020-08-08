import { HasURI, HKT5, Kind6, URIS6 } from "../HKT"

export interface ContravariantInputF<F> extends HasURI<F> {
  readonly ContravariantInput: "ContravariantInput"
  readonly contramapInput: <In1, In>(
    f: (a: In1) => In
  ) => <S, R, E, A>(fa: HKT5<F, In, S, R, E, A>) => HKT5<F, In1, S, R, E, A>
}

export interface ContravariantInput6<F extends URIS6> extends HasURI<F> {
  readonly ContravariantInput: "ContravariantInput"
  readonly contramapInput: <In1, In>(
    f: (a: In1) => In
  ) => <X, S, R, E, A>(fa: Kind6<F, X, In, S, R, E, A>) => Kind6<F, X, In1, S, R, E, A>
}

export function makeContravariantInput<URI extends URIS6>(
  _: URI
): (
  _: Omit<ContravariantInput6<URI>, "URI" | "ContravariantInput">
) => ContravariantInput6<URI>
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
