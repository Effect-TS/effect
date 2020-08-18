import { ErrFor, HasURI, HKTFull, KindFull, URIS } from "../../HKT"

export interface RecoverF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly recover: <K2, KN2 extends string, X2, SO2, I2, R2, E2, A2, E, S, SI>(
    f: (
      e: ErrFor<F, TL0, TL1, TL2, TL3, E>
    ) => HKTFull<F, TL0, TL1, TL2, TL3, K2, KN2, SI, SO2, X2, I2, S, R2, E2, A2>
  ) => <K, KN extends string, X, SO, I, R, A>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    KN | KN2,
    SI,
    SO | SO2,
    X | X2,
    I & I2,
    S,
    R & R2,
    E2,
    A | A2
  >
}

export interface RecoverK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly recover: <K2, KN2 extends string, X2, SO2, I2, R2, E2, A2, E, S, SI>(
    f: (
      e: ErrFor<F, TL0, TL1, TL2, TL3, E>
    ) => KindFull<F, TL0, TL1, TL2, TL3, K2, KN2, SI, SO2, X2, I2, S, R2, E2, A2>
  ) => <K, KN extends string, X, SO, I, R, A>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    KN | KN2,
    SI,
    SO | SO2,
    X | X2,
    I & I2,
    S,
    R & R2,
    E2,
    A | A2
  >
}
