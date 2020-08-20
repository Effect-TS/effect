import { ErrFor, HasURI, HKTFull, KindFull, URIS } from "../../HKT"

import { Either } from "@effect-ts/system/Either"

export interface RunF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    KN,
    SI,
    SO,
    X,
    I,
    S,
    R,
    never,
    Either<ErrFor<F, TL0, TL1, TL2, TL3, E>, A>
  >
}

export interface RunK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly run: <K, KN extends string, SI, SO, X, I, S, R, E, A>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    KN,
    SI,
    SO,
    X,
    I,
    S,
    R,
    never,
    Either<ErrFor<F, TL0, TL1, TL2, TL3, E>, A>
  >
}
