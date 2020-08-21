import type { Effect } from "@effect-ts/system/Effect"
import { EffectURI } from "@effect-ts/system/Effect"

import type { Array } from "../Classic/Array"
import type { Bounded } from "../Classic/Bounded"
import type { Closure } from "../Classic/Closure"
import type { Commutative } from "../Classic/Commutative"
import type { Either } from "../Classic/Either"
import type { Equal } from "../Classic/Equal"
import type { Identity } from "../Classic/Identity"
import type { Ord } from "../Classic/Ord"
import type { Record } from "../Classic/Record"
import type { Show } from "../Classic/Show"
import type { IO } from "../XPure/IO"
import type { Reader } from "../XPure/Reader"

export { EffectURI } from "@effect-ts/system/Effect"

export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

export const BoundedURI = "Bounded"
export type BoundedURI = typeof BoundedURI

export const ClosureURI = "Closure"
export type ClosureURI = typeof ClosureURI

export const CommutativeURI = "Commutative"
export type CommutativeURI = typeof CommutativeURI

export const EitherURI = "Either"
export type EitherURI = typeof EitherURI

export const EqualURI = "Equal"
export type EqualURI = typeof EqualURI

export const IdentityURI = "Identity"
export type IdentityURI = typeof IdentityURI

export const IterableURI = "IterableURI"
export type IterableURI = typeof IterableURI

export const OrdURI = "Ord"
export type OrdURI = typeof OrdURI

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

export const ShowURI = "Show"
export type ShowURI = typeof ShowURI

export const IOURI = "IO"
export type IOURI = typeof IOURI

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

declare module "../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [ArrayURI]: Array<A>
    [BoundedURI]: Bounded<A>
    [ClosureURI]: Closure<A>
    [CommutativeURI]: Commutative<A>
    [EitherURI]: Either<E, A>
    [EqualURI]: Equal<A>
    [IdentityURI]: Identity<A>
    [IterableURI]: Iterable<A>
    [OrdURI]: Ord<A>
    [RecordURI]: Record<N, A>
    [ShowURI]: Show<A>
    [EffectURI]: Effect<X, R, E, A>
    [IOURI]: IO<A>
    [ReaderURI]: Reader<R, A>
  }
  interface URItoIndex<N extends string, K> {
    [ArrayURI]: number
    [RecordURI]: N
  }
}
