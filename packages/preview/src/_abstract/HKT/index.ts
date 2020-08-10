/**
 * Inspired by https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts
 */

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

export interface HKT8<URI, SI, SO, X, In, St, Env, Err, Out> {
  readonly _URI: URI
  readonly _Out: () => Out
  readonly _Err: () => Err
  readonly _Env: (_: Env) => void
  readonly _St: St
  readonly _In: (_: In) => void
  readonly _X: () => X
  readonly _O: () => SO
  readonly _I: (_: SI) => void
}

/**
 * Typelevel Map: URI => Type
 */
export interface URItoKind<SI, SO, X, I, S, Env, Err, Out> {}

/**
 * URI of the Typelevel Map
 */
export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any>

/**
 * Kind<F, A> = URItoKind[F][A]
 */
export type Kind<URI extends URIS, SI, SO, X, In, St, Env, Err, Out> = URI extends URIS
  ? URItoKind<SI, SO, X, In, St, Env, Err, Out>[URI]
  : any

/**
 * Used to require URI in typeclasses
 */
export interface HasURI<F> {
  readonly URI: F
}

export interface HasConstrainedE<F, X> extends HasURI<F> {
  readonly E: X
}
