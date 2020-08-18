import { URIS, URItoKind } from "./registry"

export type Kind<URI extends URIS, TL0, TL1, TL2, TL3, Out> = Kind2<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  Out
>

export type Kind2<URI extends URIS, TL0, TL1, TL2, TL3, Err, Out> = Kind3<
  URI,
  TL0,
  TL1,
  TL2,
  TL3,
  any,
  Err,
  Out
>

export type Kind3<URI extends URIS, TL0, TL1, TL2, TL3, Env, Err, Out> = Kind4<
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

export type Kind4<URI extends URIS, TL0, TL1, TL2, TL3, St, Env, Err, Out> = Kind5<
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

export type Kind5<URI extends URIS, TL0, TL1, TL2, TL3, In, St, Env, Err, Out> = Kind6<
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

export type Kind6<
  URI extends URIS,
  TL0,
  TL1,
  TL2,
  TL3,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = Kind7<URI, TL0, TL1, TL2, TL3, any, X, In, St, Env, Err, Out>

export type Kind7<
  URI extends URIS,
  TL0,
  TL1,
  TL2,
  TL3,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = Kind8<URI, TL0, TL1, TL2, TL3, any, SO, X, In, St, Env, Err, Out>

export type Kind8<
  URI extends URIS,
  TL0,
  TL1,
  TL2,
  TL3,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = Kind9<URI, TL0, TL1, TL2, TL3, any, SI, SO, X, In, St, Env, Err, Out>

export type Kind9<
  URI extends URIS,
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
> = KindFull<URI, TL0, TL1, TL2, TL3, any, NK, SI, SO, X, In, St, Env, Err, Out>

export type KindFull<
  URI extends URIS,
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
> = URI extends URIS
  ? URItoKind<TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>[URI]
  : any
