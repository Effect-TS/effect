import { HasConstrainedE, HasURI, HKT10, Kind, URIS } from "../../HKT"

export interface AccessF<F> extends HasURI<F> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKT10<F, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: HKT10<F, K, NK, I, O, X, In, St, R, Err, A>
  ) => HKT10<F, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<F extends URIS> extends HasURI<F> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => Kind<F, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: Kind<F, K, NK, I, O, X, In, St, R, Err, A>
  ) => Kind<F, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessFE<F, E> extends HasConstrainedE<F, E> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKT10<F, never, never, I, O, never, In, S, R, E, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, A>(
    fa: HKT10<F, K, NK, I, O, X, In, St, R, E, A>
  ) => HKT10<F, K, NK, I, O, X, In, St, unknown, E, A>
}

export interface AccessKE<F extends URIS, E> extends HasConstrainedE<F, E> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => Kind<F, never, never, I, O, never, In, S, R, E, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, A>(
    fa: Kind<F, K, NK, I, O, X, In, St, R, E, A>
  ) => Kind<F, K, NK, I, O, X, In, St, unknown, E, A>
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

export function makeAccessE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<AccessKE<URI, E>, "URI" | "Access" | "E">) => AccessKE<URI, E>
export function makeAccessE<URI>(
  URI: URI
): <E>() => (_: Omit<AccessFE<URI, E>, "URI" | "Access" | "E">) => AccessFE<URI, E>
export function makeAccessE<URI>(
  URI: URI
): <E>() => (_: Omit<AccessFE<URI, E>, "URI" | "Access" | "E">) => AccessFE<URI, E> {
  return () => (_) => ({
    URI,
    Access: "Access",
    E: undefined as any,
    ..._
  })
}
