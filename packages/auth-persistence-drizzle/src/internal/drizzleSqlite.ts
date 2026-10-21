import { createPersistence, PersistenceConfigurationError } from "@effect/auth-persistence/Adapter"
import type { StorageTable } from "@effect/auth-persistence/Adapter"
import { getTableColumns } from "drizzle-orm"
import {
  getTableConfig,
  index,
  integer,
  type SQLiteTable,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core"
import * as Effect from "effect/Effect"
import type { SqlClient } from "effect/sql/SqlClient"

import { nativeDatabase, type NativeDatabaseHandle } from "./drizzle/nativeDatabase.ts"
import { makeDrizzleSqlTables } from "./drizzle/nativeSqlTable.ts"

const makeTable = (definition: StorageTable) =>
  sqliteTable(
    definition.name,
    Object.fromEntries(
      Object.entries(definition.columns).map(([key, column]) => {
        const builder = column.type === "text"
          ? text(column.name)
          : column.type === "boolean"
          ? integer(column.name, { mode: "boolean" })
          : integer(column.name)

        return [key, column.nullable ? builder : builder.notNull()]
      })
    ),
    (columns) => [
      ...definition.unique.map((keys, i) => {
        const [first, ...rest] = keys

        if (first === undefined) {
          // oxlint-disable-next-line effect/no-untyped-throw -- Drizzle table declaration callbacks must synchronously return constraints for schema generation.
          throw PersistenceConfigurationError.make({ reason: "An empty unique key is invalid" })
        }

        return uniqueIndex(`${definition.name}_key_${i}`).on(
          columns[first],
          ...rest.map((key) => columns[key])
        )
      }),
      ...(definition.indexes ?? []).map((keys, i) => {
        const [first, ...rest] = keys

        if (first === undefined) {
          // oxlint-disable-next-line effect/no-untyped-throw -- Drizzle table declaration callbacks must synchronously return constraints for schema generation.
          throw PersistenceConfigurationError.make({ reason: "An empty index is invalid" })
        }

        return index(`${definition.name}_index_${i}`).on(
          columns[first],
          ...rest.map((key) => columns[key])
        )
      })
    ]
  )

const describe = (table: SQLiteTable): StorageTable => {
  const config = getTableConfig(table)

  return {
    name: config.name,
    columns: Object.fromEntries(
      Object.entries(getTableColumns(table)).map(([key, column]) => [
        key,
        {
          name: column.name,
          type: column.dataType === "boolean"
            ? "boolean"
            : column.dataType === "number"
            ? "integer"
            : "text",
          nullable: !column.notNull
        }
      ])
    ),
    unique: []
  }
}

/** @internal */
export const sqlitePersistence = <R>(
  acquire: Effect.Effect<object, never, R | SqlClient>,
  options?: { readonly batch: true }
) =>
  createPersistence<SQLiteTable, R, NativeDatabaseHandle>({
    nativeTables: (database) => makeDrizzleSqlTables(database.$client, database),
    makeTable,
    describe,
    acquire: nativeDatabase(acquire),
    ...(options?.batch === true
      ? {
        batch: (database: NativeDatabaseHandle) => ({
          client: database.$client,
          execute: (statements: Parameters<typeof database.$client.batch>[0]) =>
            database.$client.batch(statements).pipe(Effect.asVoid)
        })
      }
      : {})
  })
