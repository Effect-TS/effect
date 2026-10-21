import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type { SqlClient } from "effect/sql/SqlClient"
import * as Statement from "effect/sql/Statement"

import { PersistenceMappingError } from "./mappingError.ts"
import { compileSqlExpression } from "./sqlExpression.ts"
import { identifier, Table } from "./sqlTable.ts"

export interface PhysicalTextColumn {
  readonly table: { readonly name: string; readonly schema?: string }
  readonly name: string
}

/** Capture synchronous mapping callbacks without changing SQL execution errors. */
export const sqlMapping = <A>(thunk: () => A): Effect.Effect<A, PersistenceMappingError> =>
  Effect.try({
    try: thunk,
    catch: (cause) => PersistenceMappingError.make({ operation: "mapping", cause })
  })

/** Physical SQL representation only. Semantic row codecs and policy remain in
 * the owning mapping. Execute assembled statements without name/result transforms. */
export interface SqlTable {
  readonly keys: ReadonlyArray<string>
  readonly name: Statement.Fragment
  /** Alias reads only; writes continue to target the original physical table. */
  readonly as: (alias: string) => SqlTable
  readonly column: (key: string) => Statement.Fragment
  /** Unqualified physical name for conflict targets and assignment lists. */
  readonly columnName: (key: string) => Statement.Fragment
  /** Result projection, including the physical driver's result codec cast. */
  readonly selectedColumn: (key: string) => Statement.Fragment
  /** Optional codec-free text candidate. Physical type/collation compatibility
   * must still be checked against the database before comparing columns. */
  readonly unencodedTextColumn?: (key: string) => PhysicalTextColumn | undefined
  /** Project all columns by default, or only the requested keys. Selected keys
   * retain their full-table ordinal aliases and physical result codecs. Use the
   * same keys when decoding; unselected columns are not read or decoded. */
  readonly fields: (prefix: string, keys?: ReadonlyArray<string>) => Statement.Fragment
  readonly decode: (
    row: Readonly<Record<string, unknown>>,
    prefix: string,
    keys?: ReadonlyArray<string>
  ) => Record<string, unknown>
  readonly value: (key: string, value: unknown) => Statement.Fragment
  /** Complete INSERT prefix; append conflict/returning clauses in the owning operation. */
  readonly insert: (values: Readonly<Record<string, unknown>>) => Statement.Fragment
  /** Complete UPDATE ... SET prefix; the owning operation supplies its predicate. */
  readonly update: (values: Readonly<Record<string, unknown>>) => Statement.Fragment
}

export interface NativeSqlTables {
  (table: object): SqlTable
  /** Compile a mapped predicate without executing it or acquiring resources. */
  readonly expression: (value: unknown) => Statement.Fragment
}

/** Prefixes are short ASCII identifiers so ordinal aliases cannot be truncated
 * by PostgreSQL. Callers distinguish tables by prefix, never by physical names. */
export const nativeSqlAlias = (prefix: string, index: number): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(prefix)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
    throw PersistenceMappingError.make({ operation: "mapping", cause: "Invalid SQL alias prefix" })
  }

  return `${prefix}${index}`
}

const directTable = (client: SqlClient, physical: object): SqlTable => {
  if (!(physical instanceof Table)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
    throw PersistenceMappingError.make({ operation: "mapping", cause: "Expected a SQL table" })
  }

  const quote = (name: string) => {
    if (name.includes("\0")) {
      // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
      throw PersistenceMappingError.make({ operation: "mapping", cause: "NUL in SQL identifier" })
    }

    return client.literal(identifier(name))
  }

  const name = physical.schema === undefined
    ? quote(physical.name)
    : client`${quote(physical.schema)}.${quote(physical.name)}`

  const columns = Object.entries(physical.columns)

  const getColumn = (key: string) => {
    const column = Object.hasOwn(physical.columns, key) ? physical.columns[key] : undefined

    if (column === undefined) {
      // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
      throw PersistenceMappingError.make({ operation: "column", cause: "Missing SQL column" })
    }

    return column
  }

  const ordinals = new Map(columns.map(([key], index) => [key, index]))

  const projection = (keys?: ReadonlyArray<string>) =>
    keys === undefined ? columns : keys.map((key) => [key, getColumn(key)] as const)

  const value = (key: string, input: unknown): Statement.Fragment => {
    getColumn(key)

    if (Statement.isFragment(input)) return input
    const encoded = input

    return Statement.fragment([
      Statement.parameter(
        Predicate.isBoolean(encoded)
          ? client.onDialectOrElse({ sqlite: () => Number(encoded), orElse: () => encoded })
          : encoded
      )
    ])
  }

  const entries = (values: Readonly<Record<string, unknown>>) =>
    Object.entries(values).filter(
      ([key, input]) => Object.hasOwn(physical.columns, key) && input !== undefined
    )

  const bind = (alias?: string): SqlTable => {
    const reference = alias === undefined ? name : quote(alias)
    const column = (key: string) => client`${reference}.${quote(getColumn(key).options.name)}`

    return {
      keys: columns.map(([key]) => key),
      name: alias === undefined ? name : client`${name} AS ${reference}`,
      as: bind,
      column,
      columnName: (key) => quote(getColumn(key).options.name),
      selectedColumn: column,
      unencodedTextColumn: (key) =>
        getColumn(key).options.type === "text"
          ? {
            table: {
              name: physical.name,
              ...(physical.schema === undefined ? {} : { schema: physical.schema })
            },
            name: getColumn(key).options.name
          }
          : undefined,
      value,
      fields: (prefix, keys) =>
        client.join(
          ", ",
          false
        )(
          projection(keys).map(
            ([key]) => client`${column(key)} AS ${quote(nativeSqlAlias(prefix, ordinals.get(key)!))}`
          )
        ),
      decode: (row, prefix, keys) =>
        Object.fromEntries(
          projection(keys).map(([key, field]) => {
            const alias = nativeSqlAlias(prefix, ordinals.get(key)!)

            if (!Object.hasOwn(row, alias)) {
              // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
              throw PersistenceMappingError.make({
                operation: "decode",
                cause: "Missing SQL projection field"
              })
            }

            return [key, field.decode(row[alias])]
          })
        ),
      insert: (values) => {
        const fields = entries(values)

        if (fields.length === 0) return client`INSERT INTO ${name} DEFAULT VALUES`

        return client`INSERT INTO ${name} (${
          client.join(", ", false)(fields.map(([key]) => quote(getColumn(key).options.name)))
        }) VALUES (${client.join(", ", false)(fields.map(([key, input]) => value(key, input)))})`
      },
      update: (values) => {
        const fields = entries(values)

        if (fields.length === 0) {
          // oxlint-disable-next-line effect/no-untyped-throw -- NativeSqlTables compiles and decodes synchronously; workflow executors capture these mapping failures.
          throw PersistenceMappingError.make({ operation: "mapping", cause: "Empty SQL update" })
        }

        return client`UPDATE ${name} SET ${
          client.join(", ", false)(fields.map(([key, input]) =>
            client`${quote(getColumn(key).options.name)} = ${value(key, input)}`
          ))
        }`
      }
    }
  }

  return bind()
}

/** Cache physical metadata only; insert/update materialize values and hooks at
 * each call. Construction acquires no client and owns no transaction. */
export const makeNativeSqlTables = (
  client: SqlClient,
  convert: (client: SqlClient, table: object) => SqlTable = directTable,
  expression: NativeSqlTables["expression"] = (value) => compileSqlExpression(client, value)
): NativeSqlTables => {
  const tables = new WeakMap<object, SqlTable>()

  return Object.assign(
    (table: object) => {
      const existing = tables.get(table)

      if (existing !== undefined) return existing
      const mapped = convert(client, table)

      tables.set(table, mapped)

      return mapped
    },
    { expression }
  )
}
