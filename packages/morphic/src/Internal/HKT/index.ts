export interface HKT<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

export interface HKT2<URI, E, A> extends HKT<URI, A> {
  readonly _E: E
}

export interface URItoKind<A> {}

export interface URItoKind2<E, A> {}

export type URIS = keyof URItoKind<any>

export type URIS2 = keyof URItoKind2<any, any>

export type Kind<URI extends URIS, A> = URI extends URIS ? URItoKind<A>[URI] : any

export type Kind2<URI extends URIS2, E, A> = URI extends URIS2
  ? URItoKind2<E, A>[URI]
  : any
