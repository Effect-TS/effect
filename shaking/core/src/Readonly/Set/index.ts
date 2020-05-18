/* adapted from https://github.com/gcanti/fp-ts */
export {
  chain,
  compact,
  difference,
  elem,
  every,
  filter,
  filterMap,
  foldMap,
  fromArray,
  fromSet,
  getEq,
  getShow,
  insert,
  isSubset,
  map,
  partition,
  partitionMap,
  reduce,
  remove,
  separate,
  singleton,
  some,
  toReadonlyArray,
  toSet
} from "./set"

export { empty } from "./empty"
export { getUnionMonoid } from "./getUnionMonoid"
export { intersection } from "./intersection"
export { union } from "./union"
export { getIntersectionSemigroup } from "./getIntersectionSemigroup"
