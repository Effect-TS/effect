import * as Effect from "effect/Effect"
import * as SqlClient from "effect/sql/SqlClient"

import { type PersistenceApi, PersistenceConfigurationError } from "./configuration.ts"
import { makeNativeSqlTables } from "./nativeSqlTable.ts"
import { createPersistence } from "./persistence.ts"
import { Table } from "./sqlTable.ts"
import type { StorageTable } from "./storageTables.ts"

const table = (definition: StorageTable) =>
  new Table(
    definition.name,
    definition.columns,
    definition.unique,
    definition.schema,
    definition.indexes
  )

export const AuthPersistence: PersistenceApi<Table> & { readonly table: typeof table } = {
  ...createPersistence({
    makeTable: table,
    describe: (table: Table): StorageTable => ({
      name: table.name,
      ...(table.schema === undefined ? {} : { schema: table.schema }),
      columns: Object.fromEntries(
        Object.entries(table.columns).map(([key, column]) => [key, column.options])
      ),
      unique: table.unique,
      indexes: table.indexes
    }),
    nativeTables: makeNativeSqlTables,
    acquire: Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      const dialect = sql.onDialectOrElse({
        pg: () => "pg" as const,
        sqlite: () => "sqlite" as const,
        orElse: () => undefined
      })

      if (dialect === undefined) {
        return yield* PersistenceConfigurationError.make({
          reason: "Use an explicit adapter for this SQL dialect"
        })
      }

      return sql
    })
  }),
  table
}
