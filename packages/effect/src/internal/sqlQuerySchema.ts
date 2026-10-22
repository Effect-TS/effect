/** @internal */

// JSON imports preserve object keys and null values. SQL type tags and
// nullability are therefore encoded as keys, never as widened string/boolean values.
const sqlTypes = ["INT", "INTEGER", "REAL", "TEXT"] as const
export type SqlType = typeof sqlTypes[number]
export const isSqlType = (value: string): value is SqlType => sqlTypes.some((type) => type === value)

export type Column = {
  [K in SqlType]:
    & { readonly [P in K]: null }
    & { readonly [P in Exclude<SqlType, K>]?: never }
    & { readonly NULL?: null }
}[SqlType]

export interface Snapshot {
  readonly version: number
  readonly dialect: string
  readonly tables: Readonly<Record<string, Readonly<Record<string, Column>>>>
}

interface Values {
  readonly INT: number
  readonly INTEGER: number
  readonly REAL: number
  readonly TEXT: string
  readonly NULL: null
}

type ValueOf<C> = C extends Column ? Values[Extract<keyof C, keyof Values>] : never

export type DatabaseOf<S extends Snapshot> = {
  readonly [Table in keyof S["tables"]]: {
    readonly [Name in keyof S["tables"][Table]]: ValueOf<S["tables"][Table][Name]>
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

// The import's static type checks the column structure. Also validate the
// version, dialect, and marker keys when constructing a query function.
export function assertSnapshot(value: unknown): asserts value is Snapshot {
  if (!isRecord(value) || value.version !== 2 || value.dialect !== "sqlite" || !isRecord(value.tables)) {
    throw new TypeError("Expected a version 2 SQLite schema snapshot")
  }
  const tables = new Set<string>()
  for (const [table, columns] of Object.entries(value.tables)) {
    if (tables.has(table.toLowerCase()) || !isRecord(columns) || Object.keys(columns).length === 0) {
      throw new TypeError("Invalid or duplicate table " + table)
    }
    tables.add(table.toLowerCase())
    const names = new Set<string>()
    for (const [name, column] of Object.entries(columns)) {
      if (names.has(name.toLowerCase()) || !isRecord(column)) {
        throw new TypeError("Invalid or duplicate column " + table + "." + name)
      }
      names.add(name.toLowerCase())
      const keys = Object.keys(column)
      if (
        keys.filter(isSqlType).length !== 1 ||
        keys.some((key) => (key !== "NULL" && !isSqlType(key)) || column[key] !== null)
      ) {
        throw new TypeError("Expected one SQL type and optional NULL marker for " + table + "." + name)
      }
    }
  }
}
