import { HasURI, HKTFix, KindFix, URIS } from "../../HKT"

export interface AccessF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, I, O, X, In, St, R, Err, A>
  ) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => KindFix<F, Fix0, Fix1, Fix2, Fix3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, I, O, X, In, St, R, Err, A>
  ) => KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, I, O, X, In, St, unknown, Err, A>
}

export function makeAccess<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    AccessK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AccessK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAccess<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    AccessF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AccessF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeAccess<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    AccessF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => AccessF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
