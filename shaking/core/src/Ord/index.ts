/* adapted from https://github.com/gcanti/fp-ts */
export {
  Ord,
  Ordering,
  Bounded,
  URI,
  between,
  clamp,
  contramap,
  contramap_,
  fromCompare,
  geq,
  getDualOrd,
  getMonoid,
  getSemigroup,
  getTupleOrd,
  gt,
  invert,
  leq,
  lt,
  max,
  min,
  ord,
  sign
} from "./ord"

export { ordDate } from "./ordDate"

export { boundedNumber } from "./boundedNumber"
export { eqOrdering } from "./eqOrdering"
export { compare } from "./compare"
export { monoidOrdering } from "./monoidOrdering"
export { ordBoolean } from "./ordBoolean"
export { ordNumber } from "./ordNumber"
export { ordString } from "./ordString"
export { semigroupOrdering } from "./semigroupOrdering"
