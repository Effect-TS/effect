/**
 * SQL-backed event journal with per-remote upload checkpoints.
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
 * Maintains `entryTable`, `remotesTable`, `${entryTable}_sequence` and
 * `${remotesTable}_checkpoints` using the configured `SqlClient`.
 *
 * **Gotchas**
 *
 * Creating or migrating the schema requires a writable connection. Migrated
 * databases can be reopened read-only.
 *
 * The remotes table records which entries each remote holds, whether they were
 * downloaded or acknowledged after an upload. The remote cursors table records
 * the next sequence to download from each remote, and defaults to the remotes
 * table name followed by `_cursors`. Databases created before the cursors table
 * existed start from the highest sequence in the remotes table.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: {
  readonly entryTable?: string
  readonly remotesTable?: string
  readonly remoteCursorsTable?: string
}): Effect.Effect<
  EventJournal.EventJournal["Service"],
  SqlError.SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function*() {
    const sql = (yield* SqlClient.SqlClient).withoutTransforms()

    const entryTable = options?.entryTable ?? "effect_event_journal"
    const remotesTable = options?.remotesTable ?? "effect_event_remotes"
    const remoteCursorsTable = options?.remoteCursorsTable ?? `${remotesTable}_cursors`

    const sequenceTable = `${entryTable}_sequence`
    const checkpointsTable = `${remotesTable}_checkpoints`

    const entryTableSql = sql(entryTable)
    const remotesTableSql = sql(remotesTable)
    const sequenceTableSql = sql(sequenceTable)
    const checkpointsTableSql = sql(checkpointsTable)
    const remoteCursorsTableSql = sql(remoteCursorsTable)

    // to_regclass folds unquoted names to lowercase, so pass the quoted identifier.
    const quotedSequenceTable = sql`${sequenceTableSql}`.compile(true)[0]

    // The sequence table marks a complete migration; skip DDL for read-only reopen.
    const sequenceTableExists = sql.onDialectOrElse({
      pg: () => sql`SELECT 1 AS found WHERE to_regclass(${quotedSequenceTable}) IS NOT NULL`,
      mysql: () =>
        sql`SELECT 1 AS found FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${sequenceTable}`,
      mssql: () => sql`SELECT 1 AS found WHERE OBJECT_ID(${sequenceTable}, 'U') IS NOT NULL`,
      orElse: () => sql`SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ${sequenceTable}`
    }).pipe(Effect.map((rows) => rows.length > 0))

    // PostgreSQL needs a lock and recheck to make concurrent schema creation safe.
    const migrate = Effect.gen(function*() {
      yield* sql.onDialectOrElse({
        pg: () => sql`SELECT pg_advisory_xact_lock(hashtext(${quotedSequenceTable}))`,
        orElse: () => Effect.void
      })
      if (yield* sequenceTableExists) return

      const eventIndex = sql(`${entryTable}_event_idx`)
      const timestampIndex = sql(`${entryTable}_timestamp_idx`)
      const sequenceIndex = sql(`${remotesTable}_sequence_idx`)

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

      // Insertion sequences let uploads include older entries imported later.
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
    }).pipe(sql.withTransaction, withTracerDisabled)

    if (!(yield* withTracerDisabled(sequenceTableExists))) {
      yield* migrate
    }

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteCursorsTableSql} (
            remote_id BYTEA PRIMARY KEY,
            next_sequence INT NOT NULL
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteCursorsTableSql} (
            remote_id BINARY(16) PRIMARY KEY,
            next_sequence INT NOT NULL
          )`,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteCursorsTableSql} (
            remote_id UNIQUEIDENTIFIER PRIMARY KEY,
            next_sequence INT NOT NULL
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteCursorsTableSql} (
            remote_id BLOB PRIMARY KEY,
            next_sequence INT NOT NULL
          )`
    }).pipe(withTracerDisabled)

    const decodeEntryRows = Schema.decodeUnknownEffect(EntryRowArray)
    const decodeEntryIdRows = Schema.decodeUnknownEffect(EntryIdRowArray)
    const toEntries = (rows: ReadonlyArray<EntryRow>): ReadonlyArray<EventJournal.Entry> => rows.map(toEntry)
    // Sort timestamp ties by id bytes consistently across dialects.
    const toOrderedEntries = (rows: ReadonlyArray<EntryRow>): ReadonlyArray<EventJournal.Entry> =>
      rows.map(toEntry).sort(EventJournal.Entry.Order)

    const insertEntries = SqlSchema.void({
      Request: EntryRowArray,
      execute: (entries) => sql`INSERT INTO ${entryTableSql} ${sql.insert(entries)} ON CONFLICT DO NOTHING`
    })
    // A known entry received again at a later sequence moves its row forward, so
    // `nextRemoteSequence` passes it.
    const insertRemotes = SqlSchema.void({
      Request: RemoteRowArray,
      execute: (entries) =>
        sql`
          INSERT INTO ${remotesTableSql} ${sql.insert(entries)}
          ON CONFLICT (remote_id, entry_id) DO UPDATE SET sequence = excluded.sequence
          WHERE excluded.sequence > ${remotesTableSql}.sequence
        `
    })
    // Serialize writers so checkpoints cannot skip out-of-order commits.
    // Lock before callbacks in both paths to avoid projection-row deadlocks.
    const lockWriters = sql.onDialectOrElse({
      pg: () => Effect.asVoid(sql`LOCK TABLE ${sequenceTableSql} IN SHARE ROW EXCLUSIVE MODE`),
      orElse: () => Effect.void
    })
    const insertSequence = (entries: ReadonlyArray<EventJournal.Entry>) =>
      sql`INSERT INTO ${sequenceTableSql} ${
        sql.insert(entries.map((entry) => ({ entry_id: entry.id })))
      } ON CONFLICT DO NOTHING`

    const decodeCursorRows = Schema.decodeUnknownEffect(CursorRowArray)
    const decodeMaxSequenceRows = Schema.decodeUnknownEffect(MaxSequenceRowArray)

    const readCursor = Effect.fnUntraced(function*(remoteId: EventJournal.RemoteId) {
      const rows = yield* sql`SELECT next_sequence FROM ${remoteCursorsTableSql} WHERE remote_id = ${remoteId}`.pipe(
        Effect.flatMap(decodeCursorRows)
      )
      if (rows.length > 0) return { next: rows[0].next_sequence, stored: true }
      // Before the cursors table, every remote row came from a download.
      const max = yield* sql`SELECT MAX(sequence) AS max FROM ${remotesTableSql} WHERE remote_id = ${remoteId}`.pipe(
        Effect.flatMap(decodeMaxSequenceRows)
      )
      // A concurrent ack can raise MAX past unseen entries. Its cursor commits
      // with it, so recheck that cursor before trusting the legacy maximum.
      const current = yield* sql`SELECT next_sequence FROM ${remoteCursorsTableSql} WHERE remote_id = ${remoteId}`.pipe(
        Effect.flatMap(decodeCursorRows)
      )
      if (current.length > 0) return { next: current[0].next_sequence, stored: true }
      const value = max[0]?.max
      return { next: value === null || value === undefined ? 0 : value + 1, stored: false }
    })

    const writeCursor = (remoteId: EventJournal.RemoteId, next: number, stored: boolean) =>
      stored
        ? sql`UPDATE ${remoteCursorsTableSql} SET next_sequence = ${next} WHERE remote_id = ${remoteId}`
        : sql`INSERT INTO ${remoteCursorsTableSql} ${sql.insert({ remote_id: remoteId, next_sequence: next })}`

    const pubsub = yield* PubSub.unbounded<EventJournal.Entry>()

    const writeFromRemote = Effect.fnUntraced(function*(options: WriteFromRemoteOptions): Effect.fn.Return<
      {
        readonly duplicateEntries: ReadonlyArray<EventJournal.Entry>
      },
      EventJournal.EventJournalError | Schema.SchemaError | SqlError.SqlError
    > {
      const entries = options.entries.map((remoteEntry) => remoteEntry.entry)
      // One row per entry with its highest sequence: an upsert can't touch a row twice.
      const remoteRowsById = new Map<string, typeof RemoteRow.Type>()
      for (const remoteEntry of options.entries) {
        const existing = remoteRowsById.get(remoteEntry.entry.idString)
        if (existing !== undefined && existing.sequence >= remoteEntry.remoteSequence) continue
        remoteRowsById.set(remoteEntry.entry.idString, {
          remote_id: options.remoteId,
          entry_id: remoteEntry.entry.id,
          sequence: remoteEntry.remoteSequence
        })
      }
      const remoteRows = Array.from(remoteRowsById.values())

      yield* lockWriters

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
      // Overlapping batches can repeat an entry; the first copy wins.
      const incomingIds = new Set<string>()
      const uncommitted = options.entries.filter((entry) => {
        const idString = entry.entry.idString
        if (existingIds.has(idString) || incomingIds.has(idString)) return false
        incomingIds.add(idString)
        return true
      })
      const duplicateEntries = options.entries
        .filter((entry) => existingIds.has(entry.entry.idString))
        .map((entry) => entry.entry)
      const compacted = options.compact
        ? yield* options.compact(uncommitted)
        : uncommitted.map((remoteEntry) => remoteEntry.entry)

      if (compacted.length > 0) {
        const index = new ConflictIndex(compacted)
        const primaryKeys = Array.from(new Set(compacted.map((entry) => entry.primaryKey)))
        // Match the hash index; exact predicates below rule out hash collisions.
        const hashed = sql.onDialectOrElse({
          pg: () => [
            sql`md5(event) IN (${sql.csv(index.events.map((event) => sql`md5(${event})`))})`,
            sql`md5(primary_key) IN (${sql.csv(primaryKeys.map((primaryKey) => sql`md5(${primaryKey})`))})`
          ],
          orElse: () => []
        })
        const conflicts = sql.and([
          ...hashed,
          sql.in("event", index.events),
          sql.in("primary_key", primaryKeys),
          sql`timestamp > ${index.oldestMillis}`
        ])
        const stored = yield* sql`SELECT * FROM ${entryTableSql} WHERE ${conflicts} ORDER BY timestamp ASC`.pipe(
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
      if (uncommitted.length > 0) {
        yield* insertEntries(uncommitted.map((remoteEntry) => toEntryRow(remoteEntry.entry)))
        yield* insertSequence(uncommitted.map((remoteEntry) => remoteEntry.entry))
      }
      if (remoteRows.length > 0) {
        yield* insertRemotes(remoteRows)
        // The change stream is ordered, so every earlier sequence is now known.
        let last = 0
        for (const row of remoteRows) {
          if (row.sequence > last) last = row.sequence
        }
        const cursor = yield* readCursor(options.remoteId)
        if (!cursor.stored || last + 1 > cursor.next) {
          yield* writeCursor(options.remoteId, Math.max(cursor.next, last + 1), cursor.stored)
        }
      }

      return {
        duplicateEntries
      }
    })

    const writeMany: EventJournal.EventJournal["Service"]["writeMany"] = ({ effect, entries }) =>
      Effect.uninterruptibleMask((restore) => {
        const committed = EventJournal.makeEntries(entries)
        return Effect.gen(function*() {
          yield* lockWriters
          const result = yield* restore(effect(committed)).pipe(
            Effect.mapError((error) => new CallbackFailure(error))
          )
          yield* insertEntries(committed.map(toEntryRow))
          yield* insertSequence(committed)
          return result
        }).pipe(
          sql.withTransaction,
          Effect.mapError((error) =>
            error instanceof CallbackFailure
              ? error.error
              : new EventJournal.EventJournalError({ cause: error, method: "writeMany" })
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
      entriesById: (ids) =>
        ids.length === 0 ? Effect.succeed([]) : sql`SELECT * FROM ${entryTableSql} WHERE ${sql.in("id", ids)}`.pipe(
          withTracerDisabled,
          Effect.flatMap(decodeEntryRows),
          Effect.map((rows) => {
            const byId = new Map(toEntries(rows).map((entry) => [entry.idString, entry]))
            return ids.map((id) => byId.get(Uuid.stringify(id)))
          }),
          Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "entriesById" }))
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
          // Capture an upper bound so entries committed during upload remain pending.
          const [{ checkpoint, latest }] = yield* sql`
            SELECT
              COALESCE((SELECT sequence FROM ${checkpointsTableSql} WHERE remote_id = ${remoteId}), 0) AS checkpoint,
              COALESCE((SELECT MAX(sequence) FROM ${sequenceTableSql}), 0) AS latest
          `.pipe(Effect.flatMap(decodeUploadBounds), mapError)
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
      writeRemoteAcks: ({ acks, firstSequence, remoteId }) =>
        Effect.gen(function*() {
          if (acks.length === 0) return
          // Read before inserting ack rows, whose maximum may skip unseen entries.
          const cursor = yield* readCursor(remoteId)
          yield* insertRemotes(acks.map((ack) => ({
            remote_id: remoteId,
            entry_id: ack.entryId,
            sequence: ack.sequence
          })))
          yield* writeCursor(remoteId, EventJournal.advanceSequence(cursor.next, acks, firstSequence), cursor.stored)
        }).pipe(
          sql.withTransaction,
          withTracerDisabled,
          Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "writeRemoteAcks" }))
        ),
      nextRemoteSequence: (remoteId) =>
        readCursor(remoteId).pipe(
          Effect.map((cursor) => cursor.next),
          withTracerDisabled,
          Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "nextRemoteSequence" }))
        ),
      changes: PubSub.subscribe(pubsub),
      destroy: Effect.gen(function*() {
        yield* sql`DROP TABLE ${entryTableSql}`
        yield* sql`DROP TABLE ${remotesTableSql}`
        yield* sql`DROP TABLE ${sequenceTableSql}`
        yield* sql`DROP TABLE ${checkpointsTableSql}`
        yield* sql`DROP TABLE ${remoteCursorsTableSql}`
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
 * Provides a SQL-backed `EventJournal` from an existing `SqlClient` service.
 *
 * **Gotchas**
 *
 * Creating or migrating the schema requires a writable connection.
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
  readonly remoteCursorsTable?: string
}): Layer.Layer<EventJournal.EventJournal, SqlError.SqlError, SqlClient.SqlClient> =>
  Layer.effect(EventJournal.EventJournal)(make(options))

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
  Schema.Struct({ checkpoint: SqlNatural, latest: SqlNatural })
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

const CursorRowArray = Schema.Array(Schema.Struct({ next_sequence: SqlNatural }))
const MaxSequenceRowArray = Schema.Array(Schema.Struct({ max: Schema.NullOr(SqlNatural) }))

const withTracerDisabled = Effect.withTracerEnabled(false)

// Preserve callback errors without wrapping them as journal SQL errors.
class CallbackFailure<E> {
  readonly error: E
  constructor(error: E) {
    this.error = error
  }
}
