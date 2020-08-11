import { HasURI, HKTFix, KindFix, URIS } from "../../HKT"

export interface AccessF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKTFix<F, Fix, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: HKTFix<F, Fix, K, NK, I, O, X, In, St, R, Err, A>
  ) => HKTFix<F, Fix, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Access: "Access"
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => KindFix<F, Fix, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: KindFix<F, Fix, K, NK, I, O, X, In, St, R, Err, A>
  ) => KindFix<F, Fix, K, NK, I, O, X, In, St, unknown, Err, A>
}

export function makeAccess<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<AccessK<URI, Fix>, "URI" | "Fix" | "Access">) => AccessK<URI, Fix>
export function makeAccess<URI, Fix = any>(
  URI: URI
): (_: Omit<AccessF<URI, Fix>, "URI" | "Fix" | "Access">) => AccessF<URI, Fix>
export function makeAccess<URI, Fix = any>(
  URI: URI
): (_: Omit<AccessF<URI, Fix>, "URI" | "Fix" | "Access">) => AccessF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Access: "Access",
    ..._
  })
}
