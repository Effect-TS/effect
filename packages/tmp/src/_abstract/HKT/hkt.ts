import { HasURI } from "."

export type HKT_<URI, Out> = HKT<URI, any, any, any, any, Out>

export type HKT<URI, TL0, TL1, TL2, TL3, Out> = HKT2<URI, TL0, TL1, TL2, TL3, any, Out>

export type HKT2<URI, TL0, TL1, TL2, TL3, Err, Out> = HKT3<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  Err,
  Out
>

export type HKT3_<URI, Env, Err, Out> = HKT4<
  URI,
  any,
  any,
  any,
  any,
  any,
  Env,
  Err,
  Out
>

export type HKT3<URI, TL0, TL1, TL2, TL3, Env, Err, Out> = HKT4<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  Env,
  Err,
  Out
>

export type HKT4<URI, TL0, TL1, TL2, TL3, St, Env, Err, Out> = HKT5<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  St,
  Env,
  Err,
  Out
>

export type HKT5<URI, TL0, TL1, TL2, TL3, In, St, Env, Err, Out> = HKT6<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT6<URI, TL0, TL1, TL2, TL3, X, In, St, Env, Err, Out> = HKT7<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT7<URI, TL0, TL1, TL2, TL3, SO, X, In, St, Env, Err, Out> = HKT8<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT8<URI, TL0, TL1, TL2, TL3, SI, SO, X, In, St, Env, Err, Out> = HKT9<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT9<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  NK extends string,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = HKTFull<URI, TL0, TL1, TL2, TL3, any, NK, SI, SO, X, In, St, Env, Err, Out>

export type HKTFull_<
  URI,
  K,
  NK extends string,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = HKTFull<URI, any, any, any, any, K, NK, SI, SO, X, In, St, Env, Err, Out>

export interface HKTFull<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  K,
  NK extends string,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> extends HasURI<URI, TL0, TL1, TL2, TL3> {
  readonly _Out: () => Out
  readonly _Err: () => Err
  readonly _Env: (_: Env) => void
  readonly _St: St
  readonly _In: (_: In) => void
  readonly _X: () => X
  readonly _O: () => SO
  readonly _I: (_: SI) => void
  readonly _NK: () => NK
  readonly _K: () => K
}
