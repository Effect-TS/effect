// ets_tracing: off

import "../Operator/index.js"

import type { Effect, EffectURI } from "@effect-ts/system/Effect"

import type { Async } from "../Async/index.js"
import type { Bounded } from "../Bounded/index.js"
import type { Closure } from "../Closure/index.js"
import type { Array } from "../Collections/Immutable/Array/index.js"
import type { Chunk } from "../Collections/Immutable/Chunk/index.js"
import type { Dictionary } from "../Collections/Immutable/Dictionary/index.js"
import type { List } from "../Collections/Immutable/List/index.js"
import type { NonEmptyArray } from "../Collections/Immutable/NonEmptyArray/index.js"
import type { Commutative } from "../Commutative/index.js"
import type { Const } from "../Const/index.js"
import type { Layer } from "../Effect/Layer/index.js"
import type { Either } from "../Either/index.js"
import type { Equal } from "../Equal/index.js"
import type { FreeAssociative } from "../FreeAssociative/index.js"
import type { Id } from "../Id/index.js"
import type { Identity } from "../Identity/index.js"
import type { Ix, IxC } from "../IndexedT/index.js"
import type { Inverse } from "../Inverse/index.js"
import type { IO } from "../IO/index.js"
import type { Option } from "../Option/index.js"
import type { Ord } from "../Ord/index.js"
import type { Reader } from "../Reader/index.js"
import type { Tree } from "../RoseTree/index.js"
import type { Show } from "../Show/index.js"
import type { StateIn, StateOut } from "../StateT/Classic/index.js"
import type { Sync } from "../Sync/index.js"
import type { XPure } from "../XPure/index.js"
import type { XIO } from "../XPure/XIO/index.js"
import type { XReader } from "../XPure/XReader/index.js"
import type { XState } from "../XPure/XState/index.js"

export { EffectURI } from "@effect-ts/system/Effect"

export const ArrayURI = "Array"
export type ArrayURI = typeof ArrayURI

export const NonEmptyArrayURI = "NonEmptyArray"
export type NonEmptyArrayURI = typeof NonEmptyArrayURI

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

export const DictionaryURI = "Dictionary"
export type DictionaryURI = typeof DictionaryURI

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

export const IOURI = "IO"
export type IOURI = typeof IOURI

export const XPureReaderCategoryURI = "XPureReaderCategory"
export type XPureReaderCategoryURI = typeof XPureReaderCategoryURI

export const XPureStateCategoryURI = "XPureStateCategory"
export type XPureStateCategoryURI = typeof XPureStateCategoryURI

export const IdURI = "Id"
export type IdURI = typeof IdURI

export const EffectCategoryURI = "EffectCategory"
export type EffectCategoryURI = typeof EffectCategoryURI

export const FreeAssociativeURI = "FreeAssociative"
export type FreeAssociativeURI = typeof FreeAssociativeURI

export const AsyncURI = "Async"
export type AsyncURI = typeof AsyncURI

export const TreeURI = "Tree"
export type TreeURI = typeof TreeURI

export const OptionURI = "Option"
export type OptionURI = typeof OptionURI

export const ListURI = "List"
export type ListURI = typeof ListURI

export const ChunkURI = "Chunk"
export type ChunkURI = typeof ChunkURI

declare module "../Prelude/HKT/hkt.js" {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
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
    [DictionaryURI]: Dictionary<A>
    [ShowURI]: Show<A>
    [EffectURI]: Effect<R, E, A>
    [EffectCategoryURI]: Effect<I, E, A>
    [XIOURI]: XIO<A>
    [XReaderURI]: XReader<R, A>
    [XStateURI]: XState<S, A>
    [ReaderURI]: Reader<R, A>
    [ConstURI]: Const<E, A>
    [LayerURI]: Layer<R, E, A>
    [SyncURI]: Sync<R, E, A>
    [XPureURI]: XPure<X, S, S, R, E, A>
    [XPureReaderCategoryURI]: XPure<X, S, S, I, E, A>
    [XPureStateCategoryURI]: XPure<X, I, A, R, E, A>
    [IdURI]: Id<A>
    [NonEmptyArrayURI]: NonEmptyArray<A>
    [FreeAssociativeURI]: FreeAssociative<A>
    [AsyncURI]: Async<R, E, A>
    [TreeURI]: Tree<A>
    [OptionURI]: Option<A>
    [ListURI]: List<A>
    [IOURI]: IO<A>
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
    [IxURI]: TC extends IxC<infer _I, infer _O> ? Ix<_I, _O, A> : any
    [ChunkURI]: Chunk<A>
  }
  interface URItoIndex<K> {
    [ListURI]: number
    [ArrayURI]: number
    [ChunkURI]: number
    [NonEmptyArrayURI]: number
    [DictionaryURI]: string
  }
}
