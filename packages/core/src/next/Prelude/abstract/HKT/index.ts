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
 * `* -> *` constructors
 */
export interface URItoKind<Out> {}

/**
 * `* -> * -> *` constructors
 */
export interface URItoKind2<Err, Out> {}

/**
 * `* -> * -> * -> *` constructors
 */
export interface URItoKind3<Env, Err, Out> {}

/**
 * `* -> * -> * -> * -> *` constructors
 */
export interface URItoKind4<St, Env, Err, Out> {}

/**
 * `* -> * -> * -> * -> * -> *` constructors
 */
export interface URItoKind5<In, St, Env, Err, Out> {}

/**
 * `* -> * -> * -> * -> * -> * ->` constructors
 */
export interface URItoKind6<X, In, St, Env, Err, Out> {}

//
// unions of URIs
//

/**
 * `* -> *` constructors
 */
export type URIS = keyof URItoKind<any>

/**
 * `* -> * -> *` constructors
 */
export type URIS2 = keyof URItoKind2<any, any>

/**
 * `* -> * -> * -> *` constructors
 */
export type URIS3 = keyof URItoKind3<any, any, any>

/**
 * `* -> * -> * -> * -> *` constructors
 */
export type URIS4 = keyof URItoKind4<any, any, any, any>

/**
 * `* -> * -> * -> * -> * -> *` constructors
 */
export type URIS5 = keyof URItoKind5<any, any, any, any, any>

/**
 * `* -> * -> * -> * -> * -> * -> *` constructors
 */
export type URIS6 = keyof URItoKind6<any, any, any, any, any, any>

//
// prj
//

/**
 * `* -> *` constructors
 * F[+_]
 */
export type Kind<URI extends URIS, Out> = URI extends URIS ? URItoKind<Out>[URI] : any

/**
 * `* -> * -> *` constructors
 * F[+_, +_]
 */
export type Kind2<URI extends URIS2, Err, Out> = URI extends URIS2
  ? URItoKind2<Err, Out>[URI]
  : any

/**
 * `* -> * -> * -> *` constructors
 * F[-_, +_, +_]
 */
export type Kind3<URI extends URIS3, Env, Err, Out> = URI extends URIS3
  ? URItoKind3<Env, Err, Out>[URI]
  : any

/**
 * `* -> * -> * -> * -> *` constructors
 * F[_, -_, +_, +_]
 */
export type Kind4<URI extends URIS4, St, Env, Err, Out> = URI extends URIS4
  ? URItoKind4<St, Env, Err, Out>[URI]
  : any

/**
 * `* -> * -> * -> * -> * -> *` constructors
 * F[-_, _, -_, +_, +_]
 */
export type Kind5<URI extends URIS5, In, St, Env, Err, Out> = URI extends URIS5
  ? URItoKind5<In, St, Env, Err, Out>[URI]
  : any

/**
 * `* -> * -> * -> * -> * -> *` constructors
 * F[+_, -_, _, -_, +_, +_]
 */
export type Kind6<URI extends URIS6, X, In, St, Env, Err, Out> = URI extends URIS6
  ? URItoKind6<X, In, St, Env, Err, Out>[URI]
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
