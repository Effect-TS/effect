import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"

import { PersistenceConfigurationError } from "./configuration.ts"
import type { PhysicalTextColumn } from "./nativeSqlTable.ts"
import type { StorageTable } from "./storageTables.ts"

const Columns = Schema.Array(Schema.String)
const Keys = Schema.Array(Columns)

const TextColumns = Schema.Array(
  Schema.Struct({ name: Schema.String, type: Schema.String, collation: Schema.String })
)

const Metadata = Schema.Struct({
  relation: Schema.String,
  columns: Columns,
  keys: Keys,
  textColumns: TextColumns
})

const PgMetadata = Schema.Array(Metadata)

const SqliteMetadata = Schema.Array(
  Schema.Struct({
    relation: Schema.String,
    columns: Schema.fromJsonString(Columns),
    keys: Schema.fromJsonString(Keys),
    textColumns: Schema.fromJsonString(TextColumns)
  })
)

const MysqlColumns = Schema.Array(
  Schema.Struct({
    relation: Schema.String,
    name: Schema.String,
    type: Schema.String,
    collation: Schema.NullOr(Schema.String)
  })
)

const MysqlIndexes = Schema.Array(
  Schema.Struct({
    relation: Schema.String,
    name: Schema.String,
    columnName: Schema.NullOr(Schema.String),
    prefix: Schema.NullOr(Schema.Number)
  })
)

const quote = (value: string) => "\"" + value.replaceAll("\"", "\"\"") + "\""

/** Physical metadata needed for catalog validation; value codecs remain adapter-owned. */
export interface PhysicalStorageTable {
  readonly name: string
  readonly schema?: string
  readonly columns: Readonly<Record<string, { readonly name: string }>>
}

/** @internal */
export const qualifiedTableName = (table: Pick<StorageTable, "name" | "schema">) =>
  (table.schema === undefined ? "" : quote(table.schema) + ".") + quote(table.name)

const validateKeys = Effect.fnUntraced(function*(
  table: PhysicalStorageTable,
  required: ReadonlyArray<ReadonlyArray<string>>,
  physicalKeys: ReadonlyArray<ReadonlyArray<string>>
) {
  for (const keys of required) {
    const columns = keys.map((key) => table.columns[key]?.name)

    if (
      columns.some((column) => column === undefined) ||
      !physicalKeys.some(
        // A stronger key also guarantees the required tuple's uniqueness.
        (actual) =>
          actual.length > 0 &&
          actual.length <= columns.length &&
          actual.every((column) => columns.includes(column))
      )
    ) {
      return yield* PersistenceConfigurationError.make({
        reason: `Missing unique key on ${table.name} (${keys.join(", ")})`
      })
    }
  }
})

interface MetadataCache {
  active: boolean
  readonly clients: Map<SqlClient, Map<string, typeof Metadata.Type>>
}

const CurrentMetadata = Context.Reference<MetadataCache | undefined>(
  "@effect/auth-persistence/Adapter/StorageMetadata",
  { defaultValue: () => undefined }
)

/** Share metadata only while constructing one service graph. Captured contexts
 * cannot reuse it after acquisition succeeds, fails, or is interrupted. */
export const withStorageValidation = Effect.fnUntraced(function*<A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.fn.Return<A, E, R> {
  const parent = yield* CurrentMetadata

  if (parent?.active) return yield* effect
  const cache: MetadataCache = { active: true, clients: new Map() }

  return yield* effect.pipe(
    Effect.provideService(CurrentMetadata, cache),
    Effect.ensuring(
      Effect.sync(() => {
        cache.active = false
        cache.clients.clear()
      })
    )
  )
})

/** Requirements checked against one physical catalog snapshot. */
export interface StorageValidation {
  readonly table: PhysicalStorageTable
  readonly required: ReadonlyArray<ReadonlyArray<string>>
}

type Dialect = "pg" | "mysql" | "sqlite"

/** Share physical type, collation and key observations only during acquisition. */
const readStorageMetadata = Effect.fnUntraced(
  function*(
    dialect: Dialect,
    physical: ReadonlyArray<Pick<PhysicalStorageTable, "name" | "schema">>
  ) {
    if (
      dialect === "sqlite" &&
      physical.some((table) => table.schema !== undefined && table.schema !== "main")
    ) {
      return yield* PersistenceConfigurationError.make({
        reason: "SQLite storage must belong to the main database"
      })
    }
    const captured = yield* SqlClient
    const client = captured.withoutTransforms()
    const cache = yield* CurrentMetadata

    const byRelation = cache?.active
      ? (cache.clients.get(captured) ?? new Map<string, typeof Metadata.Type>())
      : new Map<string, typeof Metadata.Type>()

    if (cache?.active) cache.clients.set(captured, byRelation)

    const tables = new Map(physical.map((table) => [qualifiedTableName(table), table]))

    const missing = [...tables.entries()].filter(
      ([relation]) => !byRelation.has(`${dialect}:${relation}`)
    )

    const relations = missing.map(([relation]) => relation)

    if (relations.length > 0) {
      const metadata = yield* dialect === "sqlite"
        ? Effect.gen(function*() {
          const requested = client.join(
            ", ",
            false
          )(missing.map(([relation, table]) => client`(${relation}, ${table.name})`))

          return yield* client`
          with requested(relation, name) as (values ${requested})
          select requested.relation,
            (select json_group_array(name) from pragma_table_info(requested.name)) as columns,
            (select json_group_array(json(storage_key.columns)) from (
              select json_group_array(name) as columns from (
                select name from pragma_table_info(requested.name) where pk > 0 order by pk
              )
              union all
              select (select json_group_array(name) from pragma_index_info(i.name)) as columns
              from pragma_index_list(requested.name) i
              where i."unique" = 1 and i.partial = 0
                and not exists(select 1 from pragma_index_info(i.name) where name is null)
            ) storage_key where json_array_length(storage_key.columns) > 0) as keys,
            (select json_group_array(json_object('name', c.name, 'type', 'TEXT', 'collation', 'BINARY'))
              from pragma_table_info(requested.name) c
              join sqlite_schema s on s.name = requested.name and s.type = 'table'
              where upper(c.type) = 'TEXT' and instr(lower(s.sql), 'collate') = 0) as "textColumns"
          from requested
        `.pipe(Effect.flatMap(Schema.decodeUnknownEffect(SqliteMetadata)))
        })
        : dialect === "mysql"
        ? Effect.gen(function*() {
          const requested = client.join(
            " union all ",
            false
          )(
            missing.map(
              ([relation, table]) =>
                client`select ${relation} as relation, ${
                  table.schema ?? null
                } as schemaName, ${table.name} as tableName`
            )
          )

          const columns = yield* client`
          select requested.relation, c.column_name as name,
            c.data_type as type, c.collation_name as collation
          from (${requested}) requested join information_schema.columns c
            on c.table_schema = coalesce(requested.schemaName, database()) and c.table_name = requested.tableName
        `.pipe(Effect.flatMap(Schema.decodeUnknownEffect(MysqlColumns)))

          const indexes = yield* client`
          select requested.relation, i.index_name as name, i.column_name as columnName, i.sub_part as prefix
          from (${requested}) requested join information_schema.statistics i
            on i.table_schema = coalesce(requested.schemaName, database()) and i.table_name = requested.tableName
          where i.non_unique = 0 order by requested.relation, i.index_name, i.seq_in_index
        `.pipe(Effect.flatMap(Schema.decodeUnknownEffect(MysqlIndexes)))

          return relations.map((relation) => {
            const grouped = new Map<string, Array<(typeof indexes)[number]>>()

            for (const index of indexes) {
              if (index.relation !== relation) continue
              const entries = grouped.get(index.name) ?? []

              entries.push(index)
              grouped.set(index.name, entries)
            }

            return {
              relation,
              columns: columns
                .filter((column) => column.relation === relation)
                .map((column) => column.name),
              textColumns: columns.flatMap((column) =>
                column.relation === relation &&
                  column.collation !== null &&
                  ["varchar", "text", "tinytext", "mediumtext", "longtext"].includes(column.type)
                  ? [{ name: column.name, type: column.type, collation: column.collation }]
                  : []
              ),
              keys: [...grouped.values()]
                .filter((entries) => entries.every((entry) => entry.columnName !== null && entry.prefix === null))
                .map((entries) => entries.flatMap((entry) => entry.columnName === null ? [] : [entry.columnName]))
            }
          })
        })
        : Effect.gen(function*() {
          const requested = client.join(
            ", ",
            false
          )(relations.map((relation) => client`(${relation}::text)`))

          return yield* client`
      select requested.relation,
        array(select a.attname::text from pg_attribute a
          where a.attrelid = to_regclass(requested.relation)
            and a.attnum > 0 and not a.attisdropped) as columns,
        coalesce((select jsonb_agg(storage_key.columns) from (
          select array_agg(a.attname::text order by k.ordinality) as columns
          from pg_index i
          cross join lateral unnest(i.indkey) with ordinality as k(attnum, ordinality)
          join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
          where i.indrelid = to_regclass(requested.relation)
            and i.indisunique and i.indisvalid and i.indimmediate
            and i.indpred is null and i.indexprs is null
            and k.ordinality <= i.indnkeyatts
          group by i.indexrelid
        ) storage_key), '[]'::jsonb) as keys,
        coalesce((select jsonb_agg(jsonb_build_object(
          'name', a.attname::text, 'type', a.atttypid::text, 'collation', a.attcollation::text))
          from pg_attribute a where a.attrelid = to_regclass(requested.relation)
            and a.attnum > 0 and not a.attisdropped
            and a.atttypid in ('text'::regtype, 'varchar'::regtype)), '[]'::jsonb) as "textColumns"
      from (values ${requested}) requested(relation)
    `.pipe(Effect.flatMap(Schema.decodeUnknownEffect(PgMetadata)))
        })

      for (const row of metadata) byRelation.set(`${dialect}:${row.relation}`, row)
    }

    return byRelation
  },
  (effect) =>
    reportPersistenceFailure(effect, Schema.is(PersistenceConfigurationError), {
      markReported: true
    }),
  Effect.catchCause((cause) =>
    Effect.failCause(
      Cause.map(cause, (error) =>
        Schema.is(PersistenceConfigurationError)(error)
          ? error
          : PersistenceConfigurationError.make({ reason: "Cannot validate SQL storage metadata" }))
    )
  )
)

/** Batch physical metadata reads, reusing only the current acquisition snapshot.
 * Every requirement is still checked; later acquisitions read fresh metadata. */
export const validateStorageBatch = Effect.fnUntraced(function*(
  dialect: Dialect,
  requirements: ReadonlyArray<StorageValidation>
) {
  if (requirements.length === 0) return

  const byRelation = yield* readStorageMetadata(
    dialect,
    requirements.map(({ table }) => table)
  )

  for (const { table, required } of requirements) {
    const relation = qualifiedTableName(table)
    const actual = byRelation.get(`${dialect}:${relation}`)

    for (const column of Object.values(table.columns)) {
      if (actual === undefined || !actual.columns.includes(column.name)) {
        return yield* PersistenceConfigurationError.make({
          reason: `Missing SQL column ${relation}.${column.name}`
        })
      }
    }
    yield* validateKeys(table, required, actual?.keys ?? [])
  }
})

/**
 * Candidate declarations do not establish SQL equality compatibility. SQLite
 * omits column collations, so only TEXT tables without COLLATE qualify.
 *
 * @internal
 */
export const canJoinTextColumns = Effect.fnUntraced(function*(
  columns: ReadonlyArray<PhysicalTextColumn | undefined>
) {
  const candidates = columns.filter((column) => column !== undefined)

  if (candidates.length !== columns.length || candidates.length === 0) return false
  const client = yield* SqlClient

  const dialect = client.onDialectOrElse({
    pg: () => "pg" as const,
    mysql: () => "mysql" as const,
    sqlite: () => "sqlite" as const,
    orElse: () => undefined
  })

  if (
    dialect === undefined ||
    (dialect === "sqlite" &&
      candidates.some(({ table }) => table.schema !== undefined && table.schema !== "main"))
  ) {
    return false
  }

  const metadata = yield* readStorageMetadata(
    dialect,
    candidates.map(({ table }) => table)
  )

  const physical = candidates.map(({ table, name }) =>
    metadata
      .get(`${dialect}:${qualifiedTableName(table)}`)
      ?.textColumns.find((column) => column.name === name)
  )

  const first = physical[0]

  return (
    first !== undefined &&
    physical.every((column) => column?.type === first.type && column.collation === first.collation)
  )
})

/** Validate physical columns and unconditional uniqueness before operations run. */
export const validateStorage = (
  dialect: "pg" | "mysql" | "sqlite",
  table: PhysicalStorageTable,
  required: ReadonlyArray<ReadonlyArray<string>>
) => validateStorageBatch(dialect, [{ table, required }])

/**
 * Stronger than ordinary mapped uniqueness: a generated managed pending key
 * must probe exactly one physical row. Schema metadata is acquired with the
 * service graph; migrations require reacquisition, as for all storage checks.
 * Resolve each catalog/PRAGMA in the same schema: TEMP can reuse index names.
 *
 * @internal
 */
export const hasManagedSqliteCleanupKey = Effect.fnUntraced(function*(
  table: PhysicalStorageTable,
  key: string
) {
  if (table.schema !== undefined && table.schema !== "main") return false
  const column = table.columns[key]

  if (column === undefined) return false
  const sql = (yield* SqlClient).withoutTransforms()

  const rows = yield* sql`
    select 1 as valid
    from main.sqlite_schema s
    where s.type = 'table' and s.name = ${table.name}
      and instr(lower(s.sql), 'collate') = 0
      and not exists(select 1 from main.sqlite_schema t where t.type = 'trigger' and t.tbl_name = s.name collate nocase)
      and not exists(select 1 from temp.sqlite_schema t
        where (t.type in ('table', 'view') and t.name = s.name collate nocase) or (t.type = 'trigger' and t.tbl_name = s.name collate nocase))
      and exists(select 1 from pragma_table_info(s.name, 'main') c
        where c.name = ${column.name} and upper(c.type) = 'TEXT' and c."notnull" = 1)
      and exists(select 1 from pragma_index_list(s.name, 'main') i
        where i."unique" = 1 and i.partial = 0
          and (select count(*) from pragma_index_xinfo(i.name, 'main') x where x.key = 1) = 1
          and exists(select 1 from pragma_index_xinfo(i.name, 'main') x
            where x.key = 1 and x.name = ${column.name} and x.coll = 'BINARY'))`

  return rows.length === 1
})
