export type HKT<URI, Out> = HKT2<URI, any, Out>

export type HKT2<URI, Err, Out> = HKT3<URI, any, Err, Out>

export type HKT3<URI, Env, Err, Out> = HKT4<URI, any, Env, Err, Out>

export type HKT4<URI, St, Env, Err, Out> = HKT5<URI, any, St, Env, Err, Out>

export type HKT5<URI, In, St, Env, Err, Out> = HKT6<URI, any, In, St, Env, Err, Out>

export type HKT6<URI, X, In, St, Env, Err, Out> = HKT7<
  URI,
  any,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT7<URI, SO, X, In, St, Env, Err, Out> = HKT8<
  URI,
  any,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT8<URI, SI, SO, X, In, St, Env, Err, Out> = HKT9<
  URI,
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

export type HKT9<URI, NK extends string, SI, SO, X, In, St, Env, Err, Out> = HKT10<
  URI,
  any,
  NK,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT10<
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

export type HKT11<
  URI,
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
> = HKTFull<URI, any, any, any, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type HKT12<
  URI,
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
> = HKTFull<URI, any, any, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type HKT13<
  URI,
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
> = HKTFull<URI, any, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type HKT14<
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
> = HKTFull<URI, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

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
> {
  readonly _URI: URI
  readonly _TL0: TL0
  readonly _TL1: TL1
  readonly _TL2: TL2
  readonly _TL3: TL3
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
