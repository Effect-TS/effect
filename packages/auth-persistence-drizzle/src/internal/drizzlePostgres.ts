import { createPersistence, PersistenceConfigurationError } from "@effect/auth-persistence/Adapter"
import type { StorageTable } from "@effect/auth-persistence/Adapter"
import { getTableColumns } from "drizzle-orm"
import { bigint, boolean, getTableConfig, index, type PgTable, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import type * as Effect from "effect/Effect"
import type { SqlClient } from "effect/sql/SqlClient"

import { nativeDatabase, type NativeDatabaseHandle } from "./drizzle/nativeDatabase.ts"
import { makeDrizzleSqlTables } from "./drizzle/nativeSqlTable.ts"

const makeTable = (definition: StorageTable) =>
  pgTable(
    definition.name,
    Object.fromEntries(
      Object.entries(definition.columns).map(([key, column]) => {
        const builder = column.type === "text"
          ? text(column.name)
          : column.type === "boolean"
          ? boolean(column.name)
          : bigint(column.name, { mode: "number" })

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

const describe = (table: PgTable): StorageTable => {
  const config = getTableConfig(table)

  return {
    name: config.name,
    ...(config.schema === undefined ? {} : { schema: config.schema }),
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
export const postgresPersistence = <R>(acquire: Effect.Effect<object, never, R | SqlClient>) =>
  createPersistence<PgTable, R, NativeDatabaseHandle>({
    nativeTables: (database) => makeDrizzleSqlTables(database.$client, database),
    makeTable,
    describe,
    acquire: nativeDatabase(acquire)
  })
