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

export type HKT7<URI, O, X, In, St, Env, Err, Out> = HKT8<
  URI,
  any,
  O,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export interface HKT8<URI, I, O, X, In, St, Env, Err, Out> {
  readonly _URI: URI
  readonly _Out: () => Out
  readonly _Err: () => Err
  readonly _Env: (_: Env) => void
  readonly _St: St
  readonly _In: (_: In) => void
  readonly _X: () => X
  readonly _O: () => O
  readonly _I: (_: I) => void
}

//
// inj: type-level dictionaries for HKTs: URI -> concrete type
//

/**
 * `* -> * -> * -> * -> * -> * ->` constructors
 */
export interface URItoKind<X, In, St, Env, Err, Out> {}

export interface URItoKindEx<I, O, X, In, St, Env, Err, Out>
  extends URItoKind<X, In, St, Env, Err, Out> {}

//
// unions of URIs
//

/**
 * `* -> * -> * -> * -> * -> * -> *` constructors
 */
export type URIS = keyof URItoKindEx<any, any, any, any, any, any, any, any>

//
// prj
//

/**
 * `* -> * -> * -> * -> * -> *` constructors
 * F[+_, -_, _, -_, +_, +_]
 */
export type Kind<URI extends URIS, X, In, St, Env, Err, Out> = URI extends URIS
  ? URItoKindEx<X, any, any, In, St, Env, Err, Out>[URI]
  : any

/**
 * `* -> * -> * -> * -> * -> *` constructors
 * F[+_, -_, _, -_, +_, +_]
 */
export type KindEx<URI extends URIS, I, O, X, In, St, Env, Err, Out> = URI extends URIS
  ? URItoKindEx<I, O, X, In, St, Env, Err, Out>[URI]
  : any

/**
 * URI
 */
export interface HasURI<F> {
  readonly URI: F
}

export function hasURI<URI extends string>(_: URI): HasURI<URI> {
  return {
    URI: _
  }
}
