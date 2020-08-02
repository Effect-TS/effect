export {
  URItoKind,
  URItoKind2,
  URItoKind3,
  URItoKind4,
  HKT,
  HKT2,
  HKT3,
  HKT4,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  MaURIS
} from "./HKT"

export type {
  CAlt,
  CAlt1,
  CAlt2,
  CAlt2C,
  CAlt3,
  CAlt3C,
  CAlt4,
  CAlt4MA,
  CAlt4MAC
} from "./Alt"

export type {
  CAlternative,
  CAlternative1,
  CAlternative2,
  CAlternative2C,
  CAlternative3
} from "./Alternative"

export type {
  CApplicative,
  CApplicative1,
  CApplicative2,
  CApplicative2C,
  CApplicative3,
  CApplicative3C,
  CApplicative4,
  CApplicative4MA,
  CApplicative4MAC,
  CApplicative4MAP,
  CApplicative4MAPC
} from "./Applicative"

export type {
  CApply,
  CApply1,
  CApply2,
  CApply2C,
  CApply3,
  CApply3C,
  CApply4,
  CApply4MA,
  CApply4MAC,
  CApply4MAP,
  CApply4MAPC
} from "./Apply"

export type {
  CBifunctor,
  CBifunctor2,
  CBifunctor2C,
  CBifunctor3,
  CBifunctor3C,
  CBifunctor4
} from "./Bifunctor"

export type {
  CChain,
  CChain1,
  CChain2,
  CChain2C,
  CChain3,
  CChain3C,
  CChain4,
  CChain4MA,
  CChain4MAC
} from "./Chain"

export type {
  CChainRec,
  CChainRec1,
  CChainRec2,
  CChainRec2C,
  CChainRec3
} from "./ChainRec"

export type { CComonad, CComonad1, CComonad2, CComonad2C, CComonad3 } from "./Comonad"

export type {
  Separated,
  CCompactable,
  CCompactable1,
  CCompactable2,
  CCompactable2C,
  CCompactable3,
  CCompactable3C,
  CCompactable4
} from "./Compactable"

export type {
  CContravariant,
  CContravariant1,
  CContravariant2,
  CContravariant2C,
  CContravariant3,
  CContravariant3C,
  CContravariant4
} from "./Contravariant"

export type {
  CExtend,
  CExtend1,
  CExtend2,
  CExtend2C,
  CExtend3,
  CExtend3C,
  CExtend4
} from "./Extend"

export type {
  CFilter,
  CFilter1,
  CFilter2,
  CFilter2C,
  CFilter3,
  CFilter3C,
  CFilter4,
  CFilterable,
  CFilterable1,
  CFilterable2,
  CFilterable2C,
  CFilterable3,
  CFilterable3C,
  CFilterable4,
  CPartition,
  CPartition1,
  Partition1,
  CPartition2,
  CPartition2C,
  CPartition3,
  CPartition3C,
  CPartition4,
  Filter2,
  Partition2,
  Filter1
} from "./Filterable"

export {
  CFilterWithIndex,
  CFilterWithIndex1,
  CFilterWithIndex2,
  CFilterWithIndex2C,
  CFilterWithIndex3,
  CFilterWithIndex3C,
  CFilterWithIndex4,
  CFilterableWithIndex,
  CFilterableWithIndex1,
  CFilterableWithIndex2,
  CFilterableWithIndex2C,
  CFilterableWithIndex3,
  CFilterableWithIndex3C,
  CFilterableWithIndex4,
  CPartitionWithIndex,
  CPartitionWithIndex1,
  CPartitionWithIndex2,
  CPartitionWithIndex2C,
  CPartitionWithIndex3,
  CPartitionWithIndex3C,
  CPartitionWithIndex4,
  PredicateWithIndex,
  RefinementWithIndex,
  PartitionWithIndex1
} from "./FilterableWithIndex"

export type {
  CFoldable,
  CFoldable1,
  CFoldable2,
  CFoldable2C,
  CFoldable3,
  CFoldable3C,
  CFoldable4
} from "./Foldable"

export type {
  CFoldableWithIndex,
  CFoldableWithIndex1,
  CFoldableWithIndex2,
  CFoldableWithIndex2C,
  CFoldableWithIndex3,
  CFoldableWithIndex3C,
  CFoldableWithIndex4
} from "./FoldableWithIndex"

export type {
  CFunctor,
  CFunctor1,
  CFunctor2,
  CFunctor2C,
  CFunctor3,
  CFunctor3C,
  CFunctor4,
  CFunctor4C
} from "./Functor"

export type {
  CFunctorWithIndex,
  CFunctorWithIndex1,
  CFunctorWithIndex2,
  CFunctorWithIndex2C,
  CFunctorWithIndex3,
  CFunctorWithIndex3C,
  CFunctorWithIndex4,
  CFunctorWithIndex4C
} from "./FunctorWithIndex"

export type {
  CMonad,
  CMonad1,
  CMonad2,
  CMonad2C,
  CMonad3,
  CMonad3C,
  CMonad4,
  CMonad4MA,
  CMonad4MAC
} from "./Monad"

export type {
  CSemigroupoid,
  CSemigroupoid2,
  CSemigroupoid2C,
  CSemigroupoid3,
  CSemigroupoid3C,
  CSemigroupoid4
} from "./Semigroupoid"

export type {
  CSequence,
  CSequence1,
  CSequence2,
  CSequence2C,
  CSequence3,
  CTraversable,
  CTraversable1,
  CTraversable2,
  CTraversable2C,
  CTraversable3,
  CTraverse,
  CTraverse1,
  CTraverse2,
  CTraverse2C,
  CTraverse3,
  Traverse2,
  Traverse1,
  Traverse2C
} from "./Traversable"

export type {
  CUnfoldable,
  CUnfoldable1,
  CUnfoldable2,
  CUnfoldable2C,
  CUnfoldable3
} from "./Unfoldable"

export type {
  CWilt,
  CWilt1,
  CWilt2,
  CWilt2C,
  CWilt3,
  CWither,
  CWither1,
  CWither2,
  CWither2C,
  CWither3,
  CWitherable,
  CWitherable1,
  CWitherable2,
  CWitherable3,
  CWitherable2C,
  Wither1,
  Wither2C,
  Wilt2C,
  Wilt1
} from "./Witherable"

export type {
  CTraversableWithIndex,
  CTraversableWithIndex1,
  CTraversableWithIndex2,
  CTraversableWithIndex2C,
  CTraversableWithIndex3,
  CTraverseWithIndex,
  CTraverseWithIndex1,
  CTraverseWithIndex2,
  CTraverseWithIndex2C,
  CTraverseWithIndex3,
  TraverseWithIndex1,
  TraverseWithIndex2C
} from "./TraversableWithIndex"

export type { COf, COf1, COf2, COf2C, COf3, COf3C, COf4, COf4C } from "./Of"

export type {
  Alt4MA,
  Alt4MAC,
  Applicative4MA,
  Applicative4MAC,
  Applicative4MAPC,
  Applicative4MAP,
  Apply4MA,
  Apply4MAC,
  Apply4MAPC,
  Apply4MAP,
  Chain4MA,
  Chain4MAC,
  Chain4MAPC,
  Chain4MAP,
  Do4MA,
  Do4MAC,
  Functor4MAC,
  Monad4MA,
  Monad4MAC,
  Monad4MAPC,
  Monad4MAP,
  MonadThrow4MA,
  MonadThrow4MAC,
  MonadThrow4MAPC,
  MonadThrow4MAP,
  PipeableAlt4MA,
  PipeableAlt4MAC,
  PipeableApply4MA,
  PipeableApply4MAC,
  PipeableApply4MAP,
  PipeableChain4MA,
  PipeableChain4MAC,
  PipeableChain4MAP,
  PipeableFunctor4MAC,
  PipeableMonadThrow4MA,
  PipeableMonadThrow4MAC
} from "./Overloads"

export type { Functor2, Functor1 } from "fp-ts/lib/Functor"
export type { FunctorWithIndex1 } from "fp-ts/lib/FunctorWithIndex"
export type { Contravariant2, Contravariant1 } from "fp-ts/lib/Contravariant"
export type { Compactable1 } from "fp-ts/lib/Compactable"
export type { Filterable1, Filterable2 } from "fp-ts/lib/Filterable"
export type { Witherable1, Witherable2C } from "fp-ts/lib/Witherable"
export type { Apply2C } from "fp-ts/lib/Apply"
export type { Chain2C } from "fp-ts/lib/Chain"
export type { Bifunctor2 } from "fp-ts/lib/Bifunctor"
export type { Monad2, Monad1, Monad2C } from "fp-ts/lib/Monad"
export type { Comonad1, Comonad2 } from "fp-ts/lib/Comonad"
export type { Foldable2, Foldable1 } from "fp-ts/lib/Foldable"
export type { Unfoldable1 } from "fp-ts/lib/Unfoldable"
export type { FoldableWithIndex1 } from "fp-ts/lib/FoldableWithIndex"
export type { Traversable1, Traversable2 } from "fp-ts/lib/Traversable"
export type { TraversableWithIndex1 } from "fp-ts/lib/TraversableWithIndex"
export type { FilterableWithIndex1 } from "fp-ts/lib/FilterableWithIndex"
export type { Alt2, Alt1, Alt2C } from "fp-ts/lib/Alt"
export type { Alternative1 } from "fp-ts/lib/Alternative"
export type { Extend2, Extend1 } from "fp-ts/lib/Extend"
export type { ChainRec2, ChainRec1, ChainRec2C } from "fp-ts/lib/ChainRec"
export type { MonadThrow2 } from "fp-ts/lib/MonadThrow"
export type {
  Applicative2,
  Applicative1,
  Applicative,
  Applicative3,
  Applicative2C,
  Applicative3C,
  Applicative4
} from "fp-ts/lib/Applicative"
export type { Semigroupoid2 } from "fp-ts/lib/Semigroupoid"

import type * as H from "./HKT"

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> extends H.URItoKind<A> {}
  interface URItoKind2<E, A> extends H.URItoKind2<E, A> {}
  interface URItoKind3<R, E, A> extends H.URItoKind3<R, E, A> {}
  interface URItoKind4<S, R, E, A> extends H.URItoKind4<S, R, E, A> {}
}
