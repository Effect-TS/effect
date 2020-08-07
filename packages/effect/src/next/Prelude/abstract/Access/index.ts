import { HKT3, Kind3, Kind4, Kind5, Kind6, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

export interface AccessF<F> {
  readonly Access: "Access"
  readonly access: <R, A>(f: (r: R) => A) => HKT3<F, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <E, A>(fa: HKT3<F, R, never, A>) => HKT3<F, unknown, E, A>
}

export interface Access3<F extends URIS3> {
  readonly Access: "Access"
  readonly access: <R, E, A>(f: (r: R) => A) => Kind3<F, R, E, A>
  readonly provide: <R>(
    r: R
  ) => <E, A>(fa: Kind3<F, R, E, A>) => Kind3<F, unknown, E, A>
}

export interface Access4<F extends URIS4> {
  readonly Access: "Access"
  readonly access: <R, A>(f: (r: R) => A) => Kind4<F, never, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <S, E, A>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, unknown, E, A>
}

export interface Access5<F extends URIS5> {
  readonly Access: "Access"
  readonly access: <R, A>(f: (r: R) => A) => Kind5<F, unknown, never, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <X, S, E, A>(fa: Kind5<F, X, S, R, E, A>) => Kind5<F, X, S, unknown, E, A>
}

export interface Access6<F extends URIS6> {
  readonly Access: "Access"
  readonly access: <R, A>(
    f: (r: R) => A
  ) => Kind6<F, unknown, unknown, never, R, unknown, A>
  readonly provide: <R>(
    r: R
  ) => <Y, X, S, E, A>(
    fa: Kind6<F, Y, X, S, R, E, A>
  ) => Kind6<F, Y, X, S, unknown, E, A>
}

export function makeAccess<URI extends URIS3>(
  _: URI
): (_: Omit<Access3<URI>, "URI" | "Access">) => Access3<URI>
export function makeAccess<URI extends URIS4>(
  _: URI
): (_: Omit<Access4<URI>, "URI" | "Access">) => Access4<URI>
export function makeAccess<URI extends URIS5>(
  _: URI
): (_: Omit<Access5<URI>, "URI" | "Access">) => Access5<URI>
export function makeAccess<URI extends URIS6>(
  _: URI
): (_: Omit<Access6<URI>, "URI" | "Access">) => Access6<URI>
export function makeAccess<URI>(
  URI: URI
): (_: Omit<AccessF<URI>, "URI" | "Access">) => AccessF<URI> {
  return (_) => ({
    URI,
    Access: "Access",
    ..._
  })
}
