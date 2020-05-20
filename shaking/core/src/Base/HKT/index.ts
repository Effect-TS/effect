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

export type {
  URIS4,
  URIS3,
  URIS2,
  URIS,
  Kind4,
  Kind3,
  Kind2,
  Kind,
  HKT4,
  HKT3,
  HKT2,
  HKT
} from "fp-ts/lib/HKT"

import type {} from "./aug"

export type MaURIS = keyof MaToKind<any, any, any, any>
