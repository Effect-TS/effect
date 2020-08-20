import type { HasURI, HKTFull, KindFull, URIS } from "../../HKT"

export interface AccessF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKTFull<F, TL0, TL1, TL2, TL3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, R, Err, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => KindFull<F, TL0, TL1, TL2, TL3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, R, Err, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, unknown, Err, A>
}
