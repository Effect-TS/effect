import { URIS, URItoKind } from "./registry"

export type Kind<URI extends URIS, Out> = Kind2<URI, any, Out>

export type Kind2<URI extends URIS, Err, Out> = Kind3<URI, any, Err, Out>

export type Kind3<URI extends URIS, Env, Err, Out> = Kind4<URI, any, Env, Err, Out>

export type Kind4<URI extends URIS, St, Env, Err, Out> = Kind5<
  URI,
  any,
  St,
  Env,
  Err,
  Out
>

export type Kind5<URI extends URIS, In, St, Env, Err, Out> = Kind6<
  URI,
  any,
  In,
  St,
  Env,
  Err,
  Out
>

export type Kind6<URI extends URIS, X, In, St, Env, Err, Out> = Kind7<
  URI,
  any,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type Kind7<URI extends URIS, SO, X, In, St, Env, Err, Out> = Kind8<
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

export type Kind8<URI extends URIS, SI, SO, X, In, St, Env, Err, Out> = Kind9<
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

export type Kind9<
  URI extends URIS,
  NK extends string,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = Kind10<URI, any, NK, SI, SO, X, In, St, Env, Err, Out>

export type Kind10<
  URI extends URIS,
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
> = Kind11<URI, any, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type Kind11<
  URI extends URIS,
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
> = Kind12<URI, any, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type Kind12<
  URI extends URIS,
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
> = Kind13<URI, any, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type Kind13<
  URI extends URIS,
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
> = Kind14<URI, any, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

export type Kind14<
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
> = KindFull<URI, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>

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
