import type { Effect } from "@effect-ts/system/Effect"
import { EffectURI } from "@effect-ts/system/Effect"

import type { Array } from "../Classic/Array"
import type { Bounded } from "../Classic/Bounded"
import type { Closure } from "../Classic/Closure"
import type { Commutative } from "../Classic/Commutative"
import type { Const } from "../Classic/Const"
import type { Either } from "../Classic/Either"
import type { Equal } from "../Classic/Equal"
import type { Identity } from "../Classic/Identity"
import type { Ix, IxC } from "../Classic/IndexedT"
import type { Inverse } from "../Classic/Inverse"
import type { Ord } from "../Classic/Ord"
import type { Reader } from "../Classic/Reader"
import type { Record } from "../Classic/Record"
import type { Show } from "../Classic/Show"
import type { StateIn, StateOut } from "../Classic/StateT"
import type { Task } from "../Classic/Task"
import type { Layer } from "../Effect/Layer"
import type { Sync } from "../Effect/Sync"
import type { XPure } from "../XPure"
import type { XIO } from "../XPure/XIO"
import type { XReader } from "../XPure/XReader"
import type { XState } from "../XPure/XState"

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

export const InverseURI = "Inverse"
export type InverseURI = typeof InverseURI

export const IterableURI = "IterableURI"
export type IterableURI = typeof IterableURI

export const OrdURI = "Ord"
export type OrdURI = typeof OrdURI

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

export const ShowURI = "Show"
export type ShowURI = typeof ShowURI

export const XIOURI = "XIO"
export type XIOURI = typeof XIOURI

export const XReaderURI = "XReader"
export type XReaderURI = typeof XReaderURI

export const XStateURI = "XState"
export type XStateURI = typeof XStateURI

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

export const StateInURI = "StateIn"
export type StateInURI = typeof StateInURI

export const ParametricStateInURI = "ParametricStateIn"
export type ParametricStateInURI = typeof ParametricStateInURI

export const StateOutURI = "StateOut"
export type StateOutURI = typeof StateOutURI

export const IxURI = "Ix"
export type IxURI = typeof IxURI

export const TaskURI = "Task"
export type TaskURI = typeof TaskURI

export const ConstURI = "Const"
export type ConstURI = typeof ConstURI

export const LayerURI = "Layer"
export type LayerURI = typeof LayerURI

export const SyncURI = "Sync"
export type SyncURI = typeof SyncURI

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [ArrayURI]: Array<A>
    [BoundedURI]: Bounded<A>
    [ClosureURI]: Closure<A>
    [CommutativeURI]: Commutative<A>
    [EitherURI]: Either<E, A>
    [EqualURI]: Equal<A>
    [IdentityURI]: Identity<A>
    [InverseURI]: Inverse<A>
    [IterableURI]: Iterable<A>
    [OrdURI]: Ord<A>
    [RecordURI]: Record<N, A>
    [ShowURI]: Show<A>
    [EffectURI]: Effect<X, R, E, A>
    [XIOURI]: XIO<A>
    [XReaderURI]: XReader<R, A>
    [XStateURI]: XState<S, A>
    [ReaderURI]: Reader<R, A>
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
    [IxURI]: TC extends IxC<infer _I, infer _O> ? Ix<_I, _O, A> : any
    [TaskURI]: Task<A>
    [ConstURI]: Const<E, A>
    [LayerURI]: Layer<S, R, E, A>
    [SyncURI]: Sync<R, E, A>
    [XPureURI]: XPure<S, S, R, E, A>
  }
  interface URItoIndex<N extends string, K> {
    [ArrayURI]: number
    [RecordURI]: N
  }
}
