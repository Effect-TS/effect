import { HKT8, Kind, URIS } from "../../HKT"

export interface AccessF<F> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKT8<F, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <I, O, X, In, St, Err, A>(
    fa: HKT8<F, I, O, X, In, St, R, Err, A>
  ) => HKT8<F, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<F extends URIS> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => Kind<F, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <I, O, X, In, St, Err, A>(
    fa: Kind<F, I, O, X, In, St, R, Err, A>
  ) => Kind<F, I, O, X, In, St, unknown, Err, A>
}

export function makeAccess<URI extends URIS>(
  _: URI
): (_: Omit<AccessK<URI>, "URI" | "Access">) => AccessK<URI>
export function makeAccess<URI>(
  URI: URI
): (_: Omit<AccessF<URI>, "URI" | "Access">) => AccessF<URI>
export function makeAccess<URI>(
  URI: URI
): (_: Omit<AccessF<URI>, "URI" | "Access">) => AccessF<URI> {
  return (_) => ({
    URI,
    Access: "Access",
    ..._
  })
}
