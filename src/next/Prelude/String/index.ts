import * as C from "../Closure"
import * as Eq from "../Equal"
import * as I from "../Identity"
import { StringSum, Sum } from "../Newtype"

/**
 * @category closure
 */
export const SumClosure = C.make<Sum<string>>((l, r) =>
  StringSum.wrap(`${StringSum.unwrap(l)}${StringSum.unwrap(r)}`)
)

/**
 * @category identity
 */
export const SumIdentity = I.make(StringSum.wrap(""), SumClosure.combine)

/**
 * @category equal
 */
export const Equal = Eq.strict<string>()
