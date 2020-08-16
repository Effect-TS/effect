export interface URItoKeys<
  TL0,
  TL1,
  TL2,
  TL3,
  K,
  NK extends string,
  SI,
  SO,
  X,
  I,
  S,
  Env,
  Err,
  Out
> {}

export type KeyFor<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  K,
  NK extends string,
  SI,
  SO,
  X,
  I,
  S,
  Env,
  Err,
  Out
> = F extends keyof URItoKeys<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? URItoKeys<TL0, TL1, TL2, TL3, K, NK, SI, SO, X, I, S, Env, Err, Out>[F]
  : never
