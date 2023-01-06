/**
 * @since 1.0.0
 */
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
  Transforms a `string` schema into a `number` schema by parsing the string value as a number.
  If the string is not a valid number representation, the decoding will fail with a `DecodeError.transform` error.
  The following special string values are supported: "NaN", "Infinity", "-Infinity".

  @param self - The `string` schema to transform.

  @since 1.0.0
*/
export const parseNumber: (self: Schema<string>) => Schema<number> = I.transformOrFail(
  I.number,
  (s: string) => {
    if (s === "NaN") {
      return DE.success(NaN)
    }
    if (s === "Infinity") {
      return DE.success(Infinity)
    }
    if (s === "-Infinity") {
      return DE.success(-Infinity)
    }
    const n = parseFloat(s)
    return isNaN(n) ?
      DE.failure(DE.transform("string", "number", s)) :
      DE.success(n)
  },
  (n) => DE.success(String(n))
)
