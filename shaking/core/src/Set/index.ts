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
  getEq,
  getShow,
  insert,
  map,
  partition,
  partitionMap,
  reduce,
  remove,
  separate,
  singleton,
  some,
  subset,
  toArray,
  toggle
} from "./set"

export { empty } from "./empty"
export { getUnionMonoid } from "./getUnionMonoid"
export { intersection } from "./intersection"
export { union } from "./union"
export { getIntersectionSemigroup } from "./getIntersectionSemigroup"
