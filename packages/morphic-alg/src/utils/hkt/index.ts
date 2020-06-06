import type { AnyEnv } from "../../config"

export interface HKT<URI, R, A> {
  readonly _URI: URI
  (_R: R): void
  readonly _A: A
}

export interface HKT2<URI, R, E, A> extends HKT<URI, R, A> {
  readonly _E: E
}

export interface URItoKind<R, A> {
  _R: R
  _A: A
}

export interface URItoKind2<R, E, A> {
  _R: R
  _A: A
  _E: E
}

export type URIS = Exclude<keyof URItoKind<any, any>, "_A" | "_R">

export type URIS2 = Exclude<keyof URItoKind2<any, any, any>, "_A" | "_E" | "_R">

export type Kind<URI extends URIS, R, A> = URI extends URIS ? URItoKind<R, A>[URI] : any

export type Kind2<URI extends URIS2, R, E, A> = URI extends URIS2
  ? URItoKind2<R, E, A>[URI]
  : any

export interface Algebra<F, Env> {
  _AF: F
  _ENV: Env
}

export interface Algebra1<F extends URIS, Env extends AnyEnv> {
  _AF: F
  _ENV: Env
}

export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
  _AF: F
  _ENV: Env
}

export type AlgebraURIS = Exclude<keyof Algebra<never, never>, "_AF" | "_ENV">
