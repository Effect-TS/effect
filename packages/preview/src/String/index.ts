import * as C from "../_abstract/Closure"
import * as Eq from "../_abstract/Equal"
import * as I from "../_abstract/Identity"
import { StringSum, Sum } from "../_abstract/Newtype"

/**
 * @category closure
 */
export const SumClosure = C.makeClosure<Sum<string>>((l, r) =>
  StringSum.wrap(`${StringSum.unwrap(l)}${StringSum.unwrap(r)}`)
)

/**
 * @category identity
 */
export const SumIdentity = I.makeIdentity(StringSum.wrap(""), SumClosure.combine)

/**
 * @category equal
 */
export const Equal = Eq.strict<string>()
