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
  CChain4MAP,
  CChain4MAC,
  CChain4MAPC
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
  CPartition2,
  CPartition2C,
  CPartition3,
  CPartition3C,
  CPartition4
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
  RefinementWithIndex
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
  CMonad4MAP,
  CMonad4MAC,
  CMonad4MAPC
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
  CTraverse3
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
  CWitherable2C
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
  CTraverseWithIndex3
} from "./TraversableWithIndex"

export type { Show } from "fp-ts/lib/Show"
export type { Monoid } from "fp-ts/lib/Monoid"
export type { Magma } from "fp-ts/lib/Magma"
export type { Semigroup } from "fp-ts/lib/Semigroup"
export type { Ring } from "fp-ts/lib/Ring"
export type { Semiring } from "fp-ts/lib/Semiring"
export type { HeytingAlgebra } from "fp-ts/lib/HeytingAlgebra"
export type { BooleanAlgebra } from "fp-ts/lib/BooleanAlgebra"
