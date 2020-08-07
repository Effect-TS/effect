/**
 * Copied from https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts
 */

/**
 * `* -> *` constructors
 */
export interface HKT<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

/**
 * `* -> * -> *` constructors
 */
export interface HKT2<URI, E, A> extends HKT<URI, A> {
  readonly _E: E
}

/**
 * `* -> * -> * -> *` constructors
 */
export interface HKT3<URI, R, E, A> extends HKT2<URI, E, A> {
  readonly _R: R
}

/**
 * `* -> * -> * -> * -> *` constructors
 */
export interface HKT4<URI, S, R, E, A> extends HKT3<URI, R, E, A> {
  readonly _S: S
}

//
// inj: type-level dictionaries for HKTs: URI -> concrete type
//

/**
 * `* -> *` constructors
 */
export interface URItoKind<A> {}

/**
 * `* -> * -> *` constructors
 */
export interface URItoKind2<E, A> {}

/**
 * `* -> * -> * -> *` constructors
 */
export interface URItoKind3<R, E, A> {}

/**
 * `* -> * -> * -> * -> *` constructors
 */
export interface URItoKind4<S, R, E, A> {}

/**
 * `* -> * -> * -> * -> * -> *` constructors
 */
export interface URItoKind5<X, S, R, E, A> {}

/**
 * `* -> * -> * -> * -> * -> * ->` constructors
 */
export interface URItoKind6<Y, X, S, R, E, A> {}

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
 */
export type Kind<URI extends URIS, A> = URI extends URIS ? URItoKind<A>[URI] : any

/**
 * `* -> * -> *` constructors
 */
export type Kind2<URI extends URIS2, E, A> = URI extends URIS2
  ? URItoKind2<E, A>[URI]
  : any

/**
 * `* -> * -> * -> *` constructors
 */
export type Kind3<URI extends URIS3, R, E, A> = URI extends URIS3
  ? URItoKind3<R, E, A>[URI]
  : any

/**
 * `* -> * -> * -> * -> *` constructors
 */
export type Kind4<URI extends URIS4, S, R, E, A> = URI extends URIS4
  ? URItoKind4<S, R, E, A>[URI]
  : any

/**
 * `* -> * -> * -> * -> * -> *` constructors
 */
export type Kind5<URI extends URIS5, X, S, R, E, A> = URI extends URIS5
  ? URItoKind5<X, S, R, E, A>[URI]
  : any

/**
 * `* -> * -> * -> * -> * -> *` constructors
 */
export type Kind6<URI extends URIS6, Y, X, S, R, E, A> = URI extends URIS6
  ? URItoKind6<Y, X, S, R, E, A>[URI]
  : any

/**
 * URI
 */
export interface HasURI<F> {
  readonly URI: F
}
