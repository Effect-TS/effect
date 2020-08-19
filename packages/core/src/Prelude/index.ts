export { Commutative, CommutativeURI, makeCommutative } from "../Classic/Commutative"
export { Any } from "./Any"
export { AssociativeBoth } from "./AssociativeBoth"
export { AssociativeEither } from "./AssociativeEither"
export { AssociativeFlatten } from "./AssociativeFlatten"
export {
  Applicative,
  IdentityBoth,
  IdentityEither,
  IdentityFlatten,
  Monad
} from "./Combined"
export { CommutativeBoth } from "./CommutativeBoth"
export { CommutativeEither } from "./CommutativeEither"
export { Compact } from "./Compact"
export { Compactable } from "./Compactable"
export { Contravariant, getContravariantComposition } from "./Contravariant"
export { Covariant, CovariantComposition, getCovariantComposition } from "./Covariant"
export { CovariantWithIndex } from "./CovariantWithIndex"
export { Derive } from "./Derive"
export { Foldable } from "./Foldable"
export { FoldableWithIndex } from "./FoldableWithIndex"
export { FoldMap, FoldMapFn } from "./FoldMap"
export { FoldMapWithIndex, FoldMapWithIndexFn } from "./FoldMapWithIndex"
export * as FX from "./FX"
export {
  Auto,
  Base,
  CompositionBase2,
  FixE,
  FixI,
  FixK,
  FixN,
  FixR,
  FixS,
  FixX,
  F_,
  F__,
  F___,
  F____,
  G_,
  HKTFull,
  HKTFullURI,
  instance,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  UF_,
  UF__,
  UF___,
  UF____,
  UG_,
  URIS,
  URItoKind
} from "./HKT"
export { Invariant } from "./Invariant"
export { None } from "./None"
export { Reduce } from "./Reduce"
export { ReduceRight } from "./ReduceRight"
export { ReduceRightWithIndex, ReduceRightWithIndexFn } from "./ReduceRightWithIndex"
export { ReduceWithIndex, ReduceWithIndexFn } from "./ReduceWithIndex"
export { Separate } from "./Separate"
export {
  Foreach,
  ForeachComposition,
  getTraversableComposition,
  implementForeachF,
  Traversable,
  TraversableComposition
} from "./Traversable"
export {
  ForeachWithIndex,
  implementForeachWithIndexF,
  TraversableWithIndex
} from "./TraversableWithIndex"
export { implementSeparateF, Wilt, Wiltable } from "./Wiltable"
export {
  implementSeparateWithIndexF,
  WiltableWithIndex,
  WiltWithIndex
} from "./WiltableWithIndex"
export { implementCompactF, Wither, Witherable } from "./Witherable"
export {
  implementCompactWithIndexF,
  WitherableWithIndex,
  WitherWithIndex
} from "./WitherableWithIndex"
