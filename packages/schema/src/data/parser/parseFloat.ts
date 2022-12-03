/**
 * @since 1.0.0
 */
import * as NumberData from "@fp-ts/schema/data/Number"
import { parse } from "@fp-ts/schema/data/parse"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/parser/parseFloat")

/**
 * @since 1.0.0
 */
export const schema = parse(
  id,
  (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) ?
      I.failure(DE.custom("cannot be converted to a number by parseFloat", s)) :
      I.success(n)
  },
  String,
  NumberData.Guard.is,
  (fc) => NumberData.Arbitrary.arbitrary(fc).filter((n) => !isNaN(n) && isFinite(n))
)
