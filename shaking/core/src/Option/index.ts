/* adapted from https://github.com/gcanti/fp-ts */
export {
  AOfOptions,
  Do,
  None,
  Option,
  Some,
  URI,
  alt,
  alt_,
  ap,
  apFirst,
  apSecond,
  ap_,
  chain,
  chainFirst,
  chain_,
  compact,
  defaultSeparate,
  duplicate,
  elem,
  exists,
  extend,
  extend_,
  filter,
  filterMap,
  filterMap_,
  filter_,
  flatten,
  fold,
  foldMap,
  foldMap_,
  fromEither,
  fromNullable,
  fromPredicate,
  getApplyMonoid,
  getApplySemigroup,
  getEq,
  getFirst,
  getFirstMonoid,
  getLast,
  getLastMonoid,
  getLeft,
  getMonoid,
  getOrElse,
  getOrd,
  getRefinement,
  getRight,
  getShow,
  identity,
  isNone,
  isSome,
  map,
  mapNullable,
  map_,
  none,
  option,
  optionMonad,
  partition,
  partitionMap,
  partitionMap_,
  partition_,
  reduce,
  reduceRight,
  reduceRight_,
  reduce_,
  separate,
  sequence,
  some,
  throwError,
  toNullable,
  toUndefined,
  traverse_,
  tryCatch,
  wilt_,
  wither_,
  zero
} from "./option"
export { sequenceArray } from "./sequenceArray"
export { sequenceRecord } from "./sequenceRecord"
export { sequenceS } from "./sequenceS"
export { sequenceT } from "./sequenceT"
export { sequenceTree } from "./sequenceTree"
export { traverseArray, traverseArray_ } from "./traverseArray"
export {
  traverseArrayWithIndex,
  traverseArrayWithIndex_
} from "./traverseArrayWithIndex"
export { traverseRecord, traverseRecord_ } from "./traverseRecord"
export {
  traverseRecordWithIndex,
  traverseRecordWithIndex_
} from "./traverseRecordWithIndex"
export { traverseTree, traverseTree_ } from "./traverseTree"
export { wiltArray, wiltArray_ } from "./wiltArray"
export { wiltRecord, wiltRecord_ } from "./wiltRecord"
export { witherArray, witherArray_ } from "./witherArray"
export { witherRecord, witherRecord_ } from "./witherRecord"
export { sequenceEither } from "./sequenceEither"
export { traverseEither, traverseEither_ } from "./traverseEither"
