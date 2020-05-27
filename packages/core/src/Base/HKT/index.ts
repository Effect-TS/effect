/* adapted from https://github.com/gcanti/fp-ts */

/* eslint-disable @typescript-eslint/no-empty-interface */

import type {
  EffectURI,
  Effect,
  Managed,
  ManagedURI,
  Stream,
  StreamURI,
  StreamEither,
  StreamEitherURI
} from "../../Support/Common"

export interface URItoKind<A> {}
export interface URItoKind2<E, A> {}
export interface URItoKind3<R, E, A> {}
export interface URItoKind4<S, R, E, A> extends MaToKind<S, R, E, A> {}

export interface MaToKind<S, R, E, A> {
  [EffectURI]: Effect<S, R, E, A>
  [ManagedURI]: Managed<S, R, E, A>
  [StreamURI]: Stream<S, R, E, A>
  [StreamEitherURI]: StreamEither<S, R, E, A>
}

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
 * `* -> * -> * -> * -> *` constructors restricted to MaTypes (behaviourally different)
 */
export type MaURIS = keyof MaToKind<any, any, any, any>

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
