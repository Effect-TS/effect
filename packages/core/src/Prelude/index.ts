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
export { Covariant, CovariantComposition, getCovariantComposition } from "./Covariant"
export { Derive } from "./Derive"
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
export { None } from "./None"
export {
  Foreach,
  ForeachComposition,
  getTraversableComposition,
  implementForeachF,
  Traversable,
  TraversableComposition
} from "./Traversable"
export { Commutative, CommutativeURI, makeCommutative } from "../Classic/Commutative"
export { CommutativeBoth } from "./CommutativeBoth"
export { CommutativeEither } from "./CommutativeEither"
export { Contravariant, getContravariantComposition } from "./Contravariant"
export { FoldMap, FoldMapFn } from "./FoldMap"
export { Reduce } from "./Reduce"
export { ReduceRight } from "./ReduceRight"
export { Foldable } from "./Foldable"
export { ReduceWithIndex, ReduceWithIndexFn } from "./ReduceWithIndex"
export { ReduceRightWithIndex, ReduceRightWithIndexFn } from "./ReduceRightWithIndex"
export { Invariant } from "./Invariant"
export { Wilt, Wiltable, implementSeparateF } from "./Wiltable"
