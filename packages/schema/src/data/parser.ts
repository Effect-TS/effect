/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const parseString: (self: Schema<string>) => Schema<number> = I.transformOrFail(
  I.number,
  (s: string) => {
    if (s === "NaN") {
      return I.success(NaN)
    }
    if (s === "Infinity") {
      return I.success(Infinity)
    }
    if (s === "-Infinity") {
      return I.success(-Infinity)
    }
    const n = parseFloat(s)
    return isNaN(n) ?
      I.failure(DE.transform("string", "number", s)) :
      I.success(n)
  },
  (n) => I.success(String(n))
)
