/**
 * Copied from https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts
 */

/**
 * `* -> *` constructors
 *
 * Out is covariant
 */
export interface HKT<URI, Out> {
  readonly _URI: URI
  readonly _Out: () => Out
}

/**
 * `* -> * -> *` constructors
 *
 * Err is covariant
 */
export interface HKT2<URI, Err, Out> extends HKT<URI, Out> {
  readonly _Err: () => Err
}

/**
 * `* -> * -> * -> *` constructors
 *
 * Env is contravariant
 */
export interface HKT3<URI, Env, Err, Out> extends HKT2<URI, Err, Out> {
  readonly _Env: (_: Env) => void
}

/**
 * `* -> * -> * -> * -> *` constructors
 *
 * St is invariant
 */
export interface HKT4<URI, St, Env, Err, Out> extends HKT3<URI, Env, Err, Out> {
  readonly _St: St
}

/**
 * `* -> * -> * -> * -> * -> *` constructors
 *
 * In is contravariant
 */
export interface HKT5<URI, In, St, Env, Err, Out> extends HKT4<URI, St, Env, Err, Out> {
  readonly _In: (_: In) => void
}

/**
 * `* -> * -> * -> * -> * -> * -> *` constructors
 *
 * X is covariant
 */
export interface HKT6<URI, X, In, St, Env, Err, Out>
  extends HKT5<URI, In, St, Env, Err, Out> {
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
