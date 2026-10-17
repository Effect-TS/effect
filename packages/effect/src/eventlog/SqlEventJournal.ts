/**
 * SQL-backed persistence for the unstable event-log journal.
 *
 * This module implements `EventJournal` on top of a `SqlClient`. It stores event
 * entries as encoded bytes and stores per-remote sequence metadata and upload
 * checkpoints in separate tables, giving event-log programs a durable journal
 * that can be replayed after restart and synchronized with remote journals.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Effect from "../Effect.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as SqlClient from "../sql/SqlClient.ts"
import * as SqlError from "../sql/SqlError.ts"
import * as SqlSchema from "../sql/SqlSchema.ts"
import * as EventJournal from "./EventJournal.ts"
import { ConflictIndex } from "./internal/conflicts.ts"

type WriteFromRemoteOptions = Parameters<EventJournal.EventJournal["Service"]["writeFromRemote"]>[0]

/**
 * Creates an `EventJournal` backed by a SQL database.
 *
 * **Details**
 *
 * The constructor creates the entry and remote metadata tables when needed,
 * persists local and remote entries, and uses the configured `SqlClient`.
 *
 * Besides `entryTable` and `remotesTable`, it maintains `${entryTable}_sequence`,
 * which numbers entries in insertion order, and `${remotesTable}_checkpoints`,
 * which records the last uploaded insertion sequence for each remote. Databases
 * created before these tables existed are migrated the first time they are
 * opened, so that first open needs a writable connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: {
  readonly entryTable?: string
  readonly remotesTable?: string
}): Effect.Effect<
  EventJournal.EventJournal["Service"],
  SqlError.SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function*() {
    const sql = (yield* SqlClient.SqlClient).withoutTransforms()

    const entryTable = options?.entryTable ?? "effect_event_journal"
    const remotesTable = options?.remotesTable ?? "effect_event_remotes"

    const sequenceTable = `${entryTable}_sequence`
    const checkpointsTable = `${remotesTable}_checkpoints`

    const entryTableSql = sql(entryTable)
    const remotesTableSql = sql(remotesTable)
    const sequenceTableSql = sql(sequenceTable)
    const checkpointsTableSql = sql(checkpointsTable)

    // The sequence table is the newest part of the schema, so when it exists
    // every table and index does and opening the journal issues no writes.
    // Read-only connections can then open a migrated database.
    const sequenceTableExists = yield* sql.onDialectOrElse({
      pg: () => {
        // Match query quoting: to_regclass folds unquoted names to lowercase.
        const quoted = sql`${sequenceTableSql}`.compile(true)[0]
        return sql`SELECT 1 AS found WHERE to_regclass(${quoted}) IS NOT NULL`
      },
      mysql: () =>
        sql`SELECT 1 AS found FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${sequenceTable}`,
      mssql: () => sql`SELECT 1 AS found WHERE OBJECT_ID(${sequenceTable}, 'U') IS NOT NULL`,
      orElse: () => sql`SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ${sequenceTable}`
    }).pipe(
      Effect.map((rows) => rows.length > 0),
      withTracerDisabled
    )
    if (!sequenceTableExists) {
      yield* migrate(sql, {
        entryTable,
        remotesTable,
        sequenceTable,
        checkpointsTable
      }).pipe(sql.withTransaction, withTracerDisabled)
    }

    const decodeEntryRows = Schema.decodeUnknownEffect(EntryRowArray)
    const decodeEntryIdRows = Schema.decodeUnknownEffect(EntryIdRowArray)
    const toEntries = (rows: ReadonlyArray<EntryRow>): ReadonlyArray<EventJournal.Entry> => rows.map(toEntry)
    // Sort by id bytes, which dialects do not all collate alike. Rows are
    // already in timestamp order, so this only reorders timestamp ties.
    const toOrderedEntries = (rows: ReadonlyArray<EntryRow>): ReadonlyArray<EventJournal.Entry> =>
      rows.map(toEntry).sort(EventJournal.Entry.Order)

    const insertEntries = SqlSchema.void({
      Request: EntryRowArray,
      execute: (entries) => sql`INSERT INTO ${entryTableSql} ${sql.insert(entries)} ON CONFLICT DO NOTHING`
    })
    const insertRemotes = SqlSchema.void({
      Request: RemoteRowArray,
      execute: (entries) => sql`INSERT INTO ${remotesTableSql} ${sql.insert(entries)} ON CONFLICT DO NOTHING`
    })
    // Must run in the transaction that inserts the entries. PostgreSQL hands out
    // sequence values before commit, so concurrent writers could commit them out
    // of order and an upload checkpoint would skip the later commit. The lock
    // serializes writers until commit without blocking readers.
    const insertSequence = (entries: ReadonlyArray<EventJournal.Entry>): Effect.Effect<void, SqlError.SqlError> =>
      Effect.gen(function*() {
        yield* sql.onDialectOrElse({
          pg: () => sql`LOCK TABLE ${sequenceTableSql} IN SHARE ROW EXCLUSIVE MODE`,
          orElse: () => Effect.void
        })
        yield* sql`INSERT INTO ${sequenceTableSql} ${
          sql.insert(entries.map((entry) => ({ entry_id: entry.id })))
        } ON CONFLICT DO NOTHING`
      })

    const pubsub = yield* PubSub.unbounded<EventJournal.Entry>()

    const writeFromRemote = Effect.fnUntraced(function*(options: WriteFromRemoteOptions): Effect.fn.Return<
      {
        readonly duplicateEntries: ReadonlyArray<EventJournal.Entry>
      },
      EventJournal.EventJournalError | Schema.SchemaError | SqlError.SqlError
    > {
      const entries = options.entries.map((remoteEntry) => remoteEntry.entry)
      const remoteRows = options.entries.map((remoteEntry) => ({
        remote_id: options.remoteId,
        entry_id: remoteEntry.entry.id,
        sequence: remoteEntry.remoteSequence
      }))

      const existingIds = new Set<string>()
      if (entries.length > 0) {
        yield* sql`SELECT id FROM ${entryTableSql} WHERE ${
          sql.in(
            "id",
            entries.map((entry) => entry.id)
          )
        }`.pipe(
          Effect.flatMap(decodeEntryIdRows),
          Effect.tap((rows) =>
            Effect.sync(() => {
              for (const row of rows) {
                existingIds.add(Uuid.stringify(row.id))
              }
            })
          )
        )
      }
      const uncommitted = options.entries.filter((entry) => !existingIds.has(entry.entry.idString))
      const duplicateEntries = options.entries
        .filter((entry) => existingIds.has(entry.entry.idString))
        .map((entry) => entry.entry)
      const compacted = options.compact
        ? yield* options.compact(uncommitted)
        : uncommitted.map((remoteEntry) => remoteEntry.entry)

      if (compacted.length > 0) {
        const index = new ConflictIndex(compacted)
        const primaryKeys = Array.from(new Set(compacted.map((entry) => entry.primaryKey)))
        // PostgreSQL indexes hashes of the unbounded columns; the exact
        // predicates below still decide which rows match.
        const hashed = sql.onDialectOrElse({
          pg: () =>
            sql`md5(event) IN (${sql.csv(index.events.map((event) => sql`md5(${event})`))}) AND
                md5(primary_key) IN (${sql.csv(primaryKeys.map((primaryKey) => sql`md5(${primaryKey})`))}) AND`,
          orElse: () => sql``
        })
        const stored = yield* sql`
            SELECT *
            FROM ${entryTableSql}
            WHERE ${hashed}
                  ${sql.in("event", index.events)} AND
                  ${sql.in("primary_key", primaryKeys)} AND
                  timestamp > ${index.oldestMillis}
            ORDER BY timestamp ASC
          `.pipe(
          Effect.flatMap(decodeEntryRows),
          Effect.map(toEntries)
        )
        for (const entry of stored) {
          index.add(entry)
        }
        yield* options.effect(index.toBatch())
      }

      // Keep the incoming batch out of conflict queries and persist only after
      // compaction and every callback have succeeded.
      if (entries.length > 0) {
        yield* insertEntries(entries.map(toEntryRow))
      }
      if (uncommitted.length > 0) {
        yield* insertSequence(uncommitted.map((remoteEntry) => remoteEntry.entry))
      }
      if (remoteRows.length > 0) {
        yield* insertRemotes(remoteRows)
      }

      return {
        duplicateEntries
      }
    })

    const writeMany: EventJournal.EventJournal["Service"]["writeMany"] = ({ effect, entries }) =>
      Effect.uninterruptibleMask((restore) => {
        const committed = EventJournal.makeEntries(entries)
        return restore(effect(committed)).pipe(
          Effect.tap(
            insertEntries(committed.map(toEntryRow)).pipe(
              Effect.andThen(insertSequence(committed)),
              sql.withTransaction,
              Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "writeMany" }))
            )
          ),
          Effect.tap(PubSub.publishAll(pubsub, committed))
        )
      }).pipe(withTracerDisabled)

    return EventJournal.EventJournal.of({
      entries: sql`SELECT * FROM ${entryTableSql} ORDER BY timestamp ASC`.pipe(
        withTracerDisabled,
        Effect.flatMap(decodeEntryRows),
        Effect.map(toOrderedEntries),
        Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "entries" }))
      ),
      write: ({ effect, ...entry }) => writeMany({ entries: [entry], effect: (entries) => effect(entries[0]) }),
      writeMany,
      writeFromRemote: (options) =>
        writeFromRemote(options).pipe(
          sql.withTransaction,
          withTracerDisabled,
          Effect.catchIf(
            (e) => e._tag !== "EventJournalError",
            (cause) => Effect.fail(new EventJournal.EventJournalError({ cause, method: "writeFromRemote" }))
          )
        ),
      withRemoteUncommited: Effect.fnUntraced(
        function*(remoteId, f) {
          const mapError = Effect.mapError((cause: unknown) =>
            new EventJournal.EventJournalError({ cause, method: "withRemoteUncommited" })
          )
          const [bounds] = yield* sql`
            SELECT
              (SELECT sequence FROM ${checkpointsTableSql} WHERE remote_id = ${remoteId}) AS checkpoint,
              (SELECT MAX(sequence) FROM ${sequenceTableSql}) AS latest
          `.pipe(Effect.flatMap(decodeUploadBounds), mapError)
          const checkpoint = bounds.checkpoint ?? 0
          // Bound the upload by the latest sequence, so the checkpoint never
          // passes entries committed while the upload runs.
          const latest = bounds.latest ?? 0
          if (latest <= checkpoint) return yield* Effect.succeedNone
          const entries = yield* sql`
            SELECT e.*
            FROM ${sequenceTableSql} s
            JOIN ${entryTableSql} e ON e.id = s.entry_id
            WHERE s.sequence > ${checkpoint} AND
                  s.sequence <= ${latest} AND
                  NOT EXISTS (
                    SELECT 1 FROM ${remotesTableSql} r WHERE r.remote_id = ${remoteId} AND r.entry_id = s.entry_id
                  )
          `.pipe(
            Effect.flatMap(decodeEntryRows),
            Effect.map(toOrderedEntries),
            mapError
          )
          // Uploads can complete out of order; the checkpoint only moves forward.
          const saveCheckpoint = sql`
            INSERT INTO ${checkpointsTableSql} ${sql.insert({ remote_id: remoteId, sequence: latest })}
            ON CONFLICT (remote_id) DO UPDATE SET sequence = excluded.sequence
            WHERE ${checkpointsTableSql}.sequence < excluded.sequence
          `.pipe(mapError)
          return yield* Effect.uninterruptibleMask((restore) =>
            restore(Arr.isReadonlyArrayNonEmpty(entries) ? Effect.asSome(f(entries)) : Effect.succeedNone).pipe(
              Effect.tap(saveCheckpoint)
            )
          )
        },
        withTracerDisabled
      ),
      nextRemoteSequence: (remoteId) =>
        sql<{ max: number | null }>`SELECT MAX(sequence) AS max FROM ${remotesTableSql} WHERE remote_id = ${remoteId}`
          .pipe(
            Effect.map((rows) => {
              const value = rows[0]?.max
              if (value === null || value === undefined) return 0
              return Number(value) + 1
            }),
            withTracerDisabled,
            Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "nextRemoteSequence" }))
          ),
      changes: PubSub.subscribe(pubsub),
      destroy: Effect.gen(function*() {
        yield* sql`DROP TABLE ${entryTableSql}`
        yield* sql`DROP TABLE ${remotesTableSql}`
        yield* sql`DROP TABLE ${sequenceTableSql}`
        yield* sql`DROP TABLE ${checkpointsTableSql}`
      }).pipe(
        withTracerDisabled,
        Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "destroy" }))
      ),
      withLock(_storeId) {
        return (effect) =>
          sql.withTransaction(effect).pipe(
            Effect.catchIf(SqlError.isSqlError, Effect.die)
          )
      }
    })
  })

/**
 * Provides `EventJournal` using the SQL-backed implementation created by
 * `make`.
 *
 * **When to use**
 *
 * Use when composing a Layer graph that should provide a persistent SQL-backed
 * `EventJournal` from an existing `SqlClient` service.
 *
 * **Details**
 *
 * The layer delegates to `make(options)`, so the same optional `entryTable` and
 * `remotesTable` settings are used and construction requires `SqlClient` and
 * may fail with `SqlError`.
 *
 * **Gotchas**
 *
 * Layer construction performs the same table and index setup as `make`, so
 * the first construction against a database created by an older release must
 * use a writable connection to migrate it.
 *
 * @see {@link make} for constructing the SQL-backed service directly
 * @see {@link EventJournal.layerMemory} for an in-memory `EventJournal` layer
 * @see {@link EventJournal.layerIndexedDb} for an IndexedDB-backed `EventJournal` layer
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: {
  readonly entryTable?: string
  readonly remotesTable?: string
}): Layer.Layer<EventJournal.EventJournal, SqlError.SqlError, SqlClient.SqlClient> =>
  Layer.effect(EventJournal.EventJournal)(make(options))

// Creates the missing tables and indexes, then numbers the existing entries.
// Databases created before upload checkpoints have only the entry and remotes
// tables. Run in one transaction, while the sequence table does not exist.
const migrate = (sql: SqlClient.SqlClient, tables: {
  readonly entryTable: string
  readonly remotesTable: string
  readonly sequenceTable: string
  readonly checkpointsTable: string
}): Effect.Effect<void, SqlError.SqlError> =>
  Effect.gen(function*() {
    const entryTableSql = sql(tables.entryTable)
    const remotesTableSql = sql(tables.remotesTable)
    const sequenceTableSql = sql(tables.sequenceTable)
    const checkpointsTableSql = sql(tables.checkpointsTable)
    const eventIndex = sql(`${tables.entryTable}_event_idx`)
    const timestampIndex = sql(`${tables.entryTable}_timestamp_idx`)
    const sequenceIndex = sql(`${tables.remotesTable}_sequence_idx`)

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${entryTableSql} (
            id BYTEA PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BYTEA NOT NULL,
            timestamp BIGINT NOT NULL
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${entryTableSql} (
            id BINARY(16) PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp BIGINT NOT NULL
          )`,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${entryTableSql} (
            id UNIQUEIDENTIFIER PRIMARY KEY,
            event NVARCHAR(MAX) NOT NULL,
            primary_key NVARCHAR(MAX) NOT NULL,
            payload VARBINARY(MAX) NOT NULL,
            timestamp BIGINT NOT NULL
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${entryTableSql} (
            id BLOB PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp INTEGER NOT NULL
          )`
    })

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remotesTableSql} (
            remote_id BYTEA NOT NULL,
            entry_id BYTEA NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remotesTableSql} (
            remote_id BINARY(16) NOT NULL,
            entry_id BINARY(16) NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remotesTableSql} (
            remote_id UNIQUEIDENTIFIER NOT NULL,
            entry_id UNIQUEIDENTIFIER NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remotesTableSql} (
            remote_id BLOB NOT NULL,
            entry_id BLOB NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`
    })

    // Entry ids order creation, not insertion, so uploads checkpoint an
    // insertion sequence instead.

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sequenceTableSql} (
            sequence BIGSERIAL PRIMARY KEY,
            entry_id BYTEA NOT NULL UNIQUE
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sequenceTableSql} (
            sequence BIGINT AUTO_INCREMENT PRIMARY KEY,
            entry_id BINARY(16) NOT NULL UNIQUE
          )`,
      mssql: () =>
        sql`
          CREATE TABLE ${sequenceTableSql} (
            sequence BIGINT IDENTITY(1,1) PRIMARY KEY,
            entry_id UNIQUEIDENTIFIER NOT NULL UNIQUE
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sequenceTableSql} (
            sequence INTEGER PRIMARY KEY,
            entry_id BLOB NOT NULL UNIQUE
          )`
    })

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${checkpointsTableSql} (
            remote_id BYTEA PRIMARY KEY,
            sequence BIGINT NOT NULL
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${checkpointsTableSql} (
            remote_id BINARY(16) PRIMARY KEY,
            sequence BIGINT NOT NULL
          )`,
      mssql: () =>
        sql`
          CREATE TABLE ${checkpointsTableSql} (
            remote_id UNIQUEIDENTIFIER PRIMARY KEY,
            sequence BIGINT NOT NULL
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${checkpointsTableSql} (
            remote_id BLOB PRIMARY KEY,
            sequence INTEGER NOT NULL
          )`
    })

    yield* sql.onDialectOrElse({
      // MySQL indexes TEXT columns by prefix only.
      mysql: () =>
        Effect.andThen(
          sql`CREATE INDEX ${eventIndex} ON ${entryTableSql} (event(191), primary_key(191), timestamp)`,
          sql`CREATE INDEX ${timestampIndex} ON ${entryTableSql} (timestamp)`
        ),
      // B-tree entries are limited to about 2.7 KB, so index hashes of the
      // unbounded columns.
      pg: () =>
        Effect.andThen(
          sql`CREATE INDEX IF NOT EXISTS ${eventIndex} ON ${entryTableSql} (md5(event), md5(primary_key), timestamp)`,
          sql`CREATE INDEX IF NOT EXISTS ${timestampIndex} ON ${entryTableSql} (timestamp)`
        ),
      // NVARCHAR(MAX) columns cannot be index keys.
      mssql: () => sql`CREATE INDEX ${timestampIndex} ON ${entryTableSql} (timestamp)`,
      orElse: () =>
        Effect.andThen(
          sql`CREATE INDEX IF NOT EXISTS ${eventIndex} ON ${entryTableSql} (event, primary_key, timestamp)`,
          sql`CREATE INDEX IF NOT EXISTS ${timestampIndex} ON ${entryTableSql} (timestamp)`
        )
    })
    yield* sql.onDialectOrElse({
      mysql: () => sql`CREATE INDEX ${sequenceIndex} ON ${remotesTableSql} (remote_id, sequence)`,
      mssql: () => sql`CREATE INDEX ${sequenceIndex} ON ${remotesTableSql} (remote_id, sequence)`,
      orElse: () => sql`CREATE INDEX IF NOT EXISTS ${sequenceIndex} ON ${remotesTableSql} (remote_id, sequence)`
    })

    // Number existing entries in creation order. `WHERE true` keeps SQLite
    // from parsing ON CONFLICT as a join constraint.
    yield* sql`
      INSERT INTO ${sequenceTableSql} (entry_id)
      SELECT id FROM ${entryTableSql} WHERE true ORDER BY timestamp ASC, id ASC
      ON CONFLICT DO NOTHING
    `
  })

const ArrayBuffer = Schema.instanceOf(globalThis.ArrayBuffer, {
  expected: "ArrayBuffer"
})

const SqlUint8Array = Schema.Union([Schema.Uint8Array, ArrayBuffer]).pipe(
  Schema.decodeTo(
    Schema.Uint8Array,
    SchemaTransformation.transform({
      decode: (value) => value instanceof globalThis.ArrayBuffer ? new globalThis.Uint8Array(value) : value,
      encode: (value) => value
    })
  )
)

const SqlEntryId = SqlUint8Array.pipe(Schema.decodeTo(EventJournal.EntryId))

const SqlNatural = Schema.Union([
  Schema.Natural,
  Schema.FiniteFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.BigInt.pipe(
    Schema.decodeTo(
      Schema.Natural,
      SchemaTransformation.transform({
        decode: Number,
        encode: BigInt
      })
    )
  )
])

const EntryRow = Schema.Struct({
  id: SqlEntryId,
  event: Schema.String,
  primary_key: Schema.String,
  payload: SqlUint8Array,
  timestamp: SqlNatural
})

const EntryRowArray = Schema.Array(EntryRow)
const decodeUploadBounds = Schema.decodeUnknownEffect(Schema.Tuple([
  Schema.Struct({
    checkpoint: Schema.NullOr(SqlNatural),
    latest: Schema.NullOr(SqlNatural)
  })
]))
const EntryIdRowArray = Schema.Array(Schema.Struct({ id: SqlEntryId }))

type EntryRow = Schema.Schema.Type<typeof EntryRow>

const toEntry = (row: EntryRow): EventJournal.Entry =>
  new EventJournal.Entry({
    id: row.id,
    event: row.event,
    primaryKey: row.primary_key,
    payload: row.payload
  }, { disableChecks: true })

const toEntryRow = (entry: EventJournal.Entry): EntryRow => ({
  id: entry.id,
  event: entry.event,
  primary_key: entry.primaryKey,
  payload: entry.payload,
  timestamp: EventJournal.entryIdMillis(entry.id)
})

const RemoteRow = Schema.Struct({
  remote_id: EventJournal.RemoteId,
  entry_id: EventJournal.EntryId,
  sequence: Schema.Natural
})

const RemoteRowArray = Schema.Array(RemoteRow)

const withTracerDisabled = Effect.withTracerEnabled(false)
