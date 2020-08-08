/**
 * Inspired by https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts
 */

/**
 * `* -> *` constructors
 *
 * Out is covariant
 */
export type HKT<URI, Out> = HKT6<URI, never, unknown, unknown, unknown, never, Out>

/**
 * `* -> * -> *` constructors
 *
 * Err is covariant
 */
export type HKT2<URI, Err, Out> = HKT6<URI, never, unknown, unknown, unknown, Err, Out>

/**
 * `* -> * -> * -> *` constructors
 *
 * Env is contravariant
 */
export type HKT3<URI, Env, Err, Out> = HKT6<URI, never, unknown, unknown, Env, Err, Out>

/**
 * `* -> * -> * -> * -> *` constructors
 *
 * St is invariant
 */
export type HKT4<URI, St, Env, Err, Out> = HKT6<URI, never, unknown, St, Env, Err, Out>

/**
 * `* -> * -> * -> * -> * -> *` constructors
 *
 * In is contravariant
 */
export type HKT5<URI, In, St, Env, Err, Out> = HKT6<URI, never, In, St, Env, Err, Out>

/**
 * `* -> * -> * -> * -> * -> * -> *` constructors
 *
 * X is covariant
 */
export interface HKT6<URI, X, In, St, Env, Err, Out> {
  readonly _URI: URI
  readonly _Out: () => Out
  readonly _Err: () => Err
  readonly _Env: (_: Env) => void
  readonly _St: St
  readonly _In: (_: In) => void
  readonly _X: () => X
}

//
// inj: type-level dictionaries for HKTs: URI -> concrete type
//

/**
 * `* -> * -> * -> * -> * -> * ->` constructors
 */
export interface URItoKind<X, In, St, Env, Err, Out> {}

//
// unions of URIs
//

/**
 * `* -> * -> * -> * -> * -> * -> *` constructors
 */
export type URIS = keyof URItoKind<any, any, any, any, any, any>

//
// prj
//

/**
 * `* -> * -> * -> * -> * -> *` constructors
 * F[+_, -_, _, -_, +_, +_]
 */
export type Kind<URI extends URIS, X, In, St, Env, Err, Out> = URI extends URIS
  ? URItoKind<X, In, St, Env, Err, Out>[URI]
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
