import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

import { PersistenceMappingError } from "./mappingError.ts"

const SqlInteger = Schema.Union([
  Schema.Int,
  Schema.BigInt,
  Schema.String.check(Schema.isPattern(/^-?\d+$/))
]).pipe(
  Schema.decodeTo(Schema.Int, {
    decode: SchemaGetter.transform(Number),
    encode: SchemaGetter.passthrough()
  })
)

const decodeInteger = Schema.decodeUnknownOption(SqlInteger)

/** @internal */
export const identifier = (name: string) => "\"" + name.replaceAll("\"", "\"\"") + "\""

export interface ColumnOptions {
  readonly name: string
  /** Driver value representation, not the database column's physical SQL type. */
  readonly type: "text" | "integer" | "boolean"
  readonly nullable?: boolean
}

export class Column {
  readonly tableName: string
  readonly options: ColumnOptions
  readonly schema?: string

  constructor(
    tableName: string,
    options: ColumnOptions,
    schema?: string
  ) {
    this.tableName = tableName
    this.options = options
    if (schema !== undefined) this.schema = schema
  }

  decode(value: unknown): unknown {
    if (value === null) return value
    if (this.options.type === "boolean") {
      if (value === true || value === 1) return true
      if (value === false || value === 0) return false
      // oxlint-disable-next-line effect/no-untyped-throw -- SQL column codecs expose a synchronous decode contract; workflow adapters capture these mapping failures.
      throw PersistenceMappingError.make({ operation: "decode", cause: "Invalid SQL boolean" })
    }
    if (this.options.type === "integer") {
      const number = decodeInteger(value)

      if (Option.isSome(number)) return number.value
      // oxlint-disable-next-line effect/no-untyped-throw -- SQL column codecs expose a synchronous decode contract; workflow adapters capture these mapping failures.
      throw PersistenceMappingError.make({
        operation: "decode",
        cause: "SQL integer is outside the safe range"
      })
    }

    return value
  }
}

/** Plain SQL identifiers and column representations, independent of an ORM. */
export class Table {
  readonly name: string
  readonly columns: Readonly<Record<string, Column>>
  readonly unique: ReadonlyArray<ReadonlyArray<string>>
  readonly schema?: string
  readonly indexes: ReadonlyArray<ReadonlyArray<string>>

  constructor(
    name: string,
    columns: Readonly<Record<string, ColumnOptions>>,
    unique: ReadonlyArray<ReadonlyArray<string>>,
    schema?: string,
    indexes: ReadonlyArray<ReadonlyArray<string>> = []
  ) {
    this.name = name
    this.unique = unique
    if (schema !== undefined) this.schema = schema
    this.indexes = indexes
    this.columns = Object.fromEntries(
      Object.entries(columns).map(([key, options]) => [key, new Column(name, options, schema)])
    )
  }
}
