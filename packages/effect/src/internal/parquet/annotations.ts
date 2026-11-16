/**
 * The logical type that LogicalTypes.md gives for each converted type
 * (https://github.com/apache/parquet-format/blob/apache-parquet-format-2.14.0/LogicalTypes.md).
 *
 * @internal
 */
import type { ConvertedType, LogicalType } from "../../encoding/Parquet.ts"

/**
 * A logical type, or a converted type as the logical type that replaced it.
 * `INTERVAL` and `MAP_KEY_VALUE` have no logical type, so they keep their names.
 *
 * @internal
 */
export type Annotation = LogicalType | { readonly type: "INTERVAL" | "MAP_KEY_VALUE" }

const utc = (type: "TIME" | "TIMESTAMP", unit: "MILLIS" | "MICROS"): Annotation => ({
  type,
  isAdjustedToUTC: true,
  unit
})

const integer = (bitWidth: number, isSigned: boolean): Annotation => ({ type: "INTEGER", bitWidth, isSigned })

/**
 * `DECIMAL` is not here: its scale and precision come from the schema element.
 *
 * @internal
 */
export const logicalOf: { readonly [K in Exclude<ConvertedType, "DECIMAL">]: Annotation } = {
  UTF8: { type: "STRING" },
  MAP: { type: "MAP" },
  MAP_KEY_VALUE: { type: "MAP_KEY_VALUE" },
  LIST: { type: "LIST" },
  ENUM: { type: "ENUM" },
  DATE: { type: "DATE" },
  TIME_MILLIS: utc("TIME", "MILLIS"),
  TIME_MICROS: utc("TIME", "MICROS"),
  TIMESTAMP_MILLIS: utc("TIMESTAMP", "MILLIS"),
  TIMESTAMP_MICROS: utc("TIMESTAMP", "MICROS"),
  UINT_8: integer(8, false),
  UINT_16: integer(16, false),
  UINT_32: integer(32, false),
  UINT_64: integer(64, false),
  INT_8: integer(8, true),
  INT_16: integer(16, true),
  INT_32: integer(32, true),
  INT_64: integer(64, true),
  JSON: { type: "JSON" },
  BSON: { type: "BSON" },
  INTERVAL: { type: "INTERVAL" }
}
