/**
 * Stores encrypted event-log server state in SQL.
 *
 * This module provides the durable `Storage` implementation used by
 * `EventLogServerEncrypted` when entries should be stored without exposing
 * plaintext event data to the database. It persists the server remote id,
 * session authentication bindings, and encrypted batch tables, assigns stable
 * sequence numbers, and streams changes. Clients remain responsible for
 * encrypting writes and decrypting reads.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import type { NonEmptyArray } from "../Array.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as RcMap from "../RcMap.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as SqlClient from "../sql/SqlClient.ts"
import type * as SqlError from "../sql/SqlError.ts"
import type * as Statement from "../sql/Statement.ts"
import * as Stream from "../Stream.ts"
import { type EntryId, makeRemoteIdUnsafe, type RemoteId } from "./EventJournal.ts"
import * as EventLogEncryption from "./EventLogEncryption.ts"
import type { WriteAck } from "./EventLogMessage.ts"
import * as EventLogServerEncrypted from "./EventLogServerEncrypted.ts"

/**
 * Creates encrypted event-log server `Storage` backed by SQL.
 *
 * **Details**
 *
 * It persists the server remote id, session authentication bindings, and encrypted
 * batches in dialect-specific tables, creating per-identity/store batch and entry
 * id tables as needed.
 *
 * **Gotchas**
 *
 * Storage does not retry sequence conflicts between competing instances.
 * `EventLog.runRemote` retries failed writes; direct `EventLogRemote.write`
 * callers must retry failures other than Forbidden themselves. Live notifications
 * are local to each storage instance; clients on other instances must reconnect
 * to read those writes.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeStorage = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
}): Effect.Effect<
  EventLogServerEncrypted.Storage["Service"],
  SqlError.SqlError,
  SqlClient.SqlClient | EventLogEncryption.EventLogEncryption | Scope.Scope
> =>
  Effect.gen(function*() {
    const encryptions = yield* EventLogEncryption.EventLogEncryption
    const sql = (yield* SqlClient.SqlClient).withoutTransforms()

    const tablePrefix = options?.entryTablePrefix ?? "effect_events"
    const remoteIdTable = options?.remoteIdTable ?? "effect_remote_id"
    const sessionAuthBindingsTable = `${tablePrefix}_session_auth_bindings`

    const remoteIdTableSql = sql(remoteIdTable)
    const sessionAuthBindingsTableSql = sql(sessionAuthBindingsTable)

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteIdTableSql} (
            remote_id BYTEA PRIMARY KEY
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteIdTableSql} (
            remote_id BINARY(16) PRIMARY KEY
          )`,
      mssql: () =>
        sql`
          IF OBJECT_ID(${remoteIdTable}, N'U') IS NULL
          CREATE TABLE ${remoteIdTableSql} (
            remote_id VARBINARY(16) PRIMARY KEY
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${remoteIdTableSql} (
            remote_id BLOB PRIMARY KEY
          )`
    })

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sessionAuthBindingsTableSql} (
            public_key TEXT PRIMARY KEY,
            signing_public_key BYTEA NOT NULL
          )`,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sessionAuthBindingsTableSql} (
            public_key VARCHAR(191) PRIMARY KEY,
            signing_public_key BINARY(32) NOT NULL
          )`,
      mssql: () =>
        sql`
          IF OBJECT_ID(${sessionAuthBindingsTable}, N'U') IS NULL
          CREATE TABLE ${sessionAuthBindingsTableSql} (
            public_key NVARCHAR(191) PRIMARY KEY,
            signing_public_key VARBINARY(32) NOT NULL
          )`,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sessionAuthBindingsTableSql} (
            public_key TEXT PRIMARY KEY,
            signing_public_key BLOB NOT NULL
          )`
    })

    const remoteId = yield* sql<{ remote_id: Uint8Array }>`SELECT remote_id FROM ${remoteIdTableSql}`.pipe(
      Effect.flatMap((results) => {
        if (results.length > 0) {
          return Effect.succeed(results[0].remote_id as RemoteId)
        }
        const created = makeRemoteIdUnsafe()
        return Effect.as(
          sql`INSERT INTO ${remoteIdTableSql} (remote_id) VALUES (${created})`,
          created
        )
      })
    )

    const resources = yield* RcMap.make({
      lookup: Effect.fnUntraced(function*(scopeKey: string) {
        const scopeHash = (yield* encryptions.sha256String(new TextEncoder().encode(scopeKey))).slice(0, 16)
        const table = `${tablePrefix}_${scopeHash}`
        const tableSql = sql(table)
        const idsTableSql = sql(`${table}_ids`)
        const indexSql = sql(`${table}_last_sequence`)

        yield* sql.onDialectOrElse({
          pg: () =>
            sql`
                CREATE TABLE IF NOT EXISTS ${tableSql} (
                  sequence INTEGER PRIMARY KEY,
                  last_sequence INTEGER NOT NULL,
                  iv BYTEA NOT NULL,
                  entry_ids BYTEA NOT NULL,
                  encrypted_batch BYTEA NOT NULL
                )`.pipe(
              Effect.andThen(sql`CREATE INDEX IF NOT EXISTS ${indexSql} ON ${tableSql} (last_sequence)`),
              Effect.andThen(sql`
                CREATE TABLE IF NOT EXISTS ${idsTableSql} (
                  entry_id BYTEA PRIMARY KEY,
                  sequence INTEGER NOT NULL
                )`)
            ),
          mysql: () =>
            sql`
                CREATE TABLE IF NOT EXISTS ${tableSql} (
                  sequence INT PRIMARY KEY,
                  last_sequence INT NOT NULL,
                  iv BINARY(12) NOT NULL,
                  entry_ids LONGBLOB NOT NULL,
                  encrypted_batch LONGBLOB NOT NULL,
                  INDEX (last_sequence)
                )`.pipe(
              Effect.andThen(sql`
                CREATE TABLE IF NOT EXISTS ${idsTableSql} (
                  entry_id BINARY(16) PRIMARY KEY,
                  sequence INT NOT NULL
                )`)
            ),
          mssql: () =>
            sql`
                IF OBJECT_ID(${table}, N'U') IS NULL
                CREATE TABLE ${tableSql} (
                  sequence INT PRIMARY KEY,
                  last_sequence INT NOT NULL,
                  iv VARBINARY(12) NOT NULL,
                  entry_ids VARBINARY(MAX) NOT NULL,
                  encrypted_batch VARBINARY(MAX) NOT NULL,
                  INDEX ${indexSql} NONCLUSTERED (last_sequence)
                )`.pipe(
              Effect.andThen(sql`
                IF OBJECT_ID(${`${table}_ids`}, N'U') IS NULL
                CREATE TABLE ${idsTableSql} (
                  entry_id VARBINARY(16) PRIMARY KEY,
                  sequence INT NOT NULL
                )`)
            ),
          orElse: () =>
            sql`
                CREATE TABLE IF NOT EXISTS ${tableSql} (
                  sequence INTEGER PRIMARY KEY,
                  last_sequence INTEGER NOT NULL,
                  iv BLOB NOT NULL,
                  entry_ids BLOB NOT NULL,
                  encrypted_batch BLOB NOT NULL
                )`.pipe(
              Effect.andThen(sql`CREATE INDEX IF NOT EXISTS ${indexSql} ON ${tableSql} (last_sequence)`),
              Effect.andThen(sql`
                CREATE TABLE IF NOT EXISTS ${idsTableSql} (
                  entry_id BLOB PRIMARY KEY,
                  sequence INTEGER NOT NULL
                )`)
            )
        })

        const pubsub = yield* Effect.acquireRelease(
          PubSub.unbounded<EventLogEncryption.EncryptedRemoteBatch>(),
          PubSub.shutdown
        )
        // Serializes writes within this storage instance.
        const semaphore = yield* Semaphore.make(1)
        return { pubsub, semaphore, tableSql, idsTableSql } as const
      }, withTracerDisabled),
      idleTimeToLive: "5 minutes"
    })

    // Returns how many of the ids were not stored yet. Stored ids keep their
    // first sequence.
    const insertNewIds = (idsTableSql: Statement.Identifier, rows: ReadonlyArray<IdRow>) =>
      sql.onDialectOrElse({
        mysql: () =>
          sql`INSERT IGNORE INTO ${idsTableSql} ${sql.insert(rows)}`.raw.pipe(
            Effect.map((result) => (result as { affectedRows: number }).affectedRows)
          ),
        mssql: () =>
          sql`
            MERGE ${idsTableSql} WITH (HOLDLOCK) AS target
            USING (VALUES ${
            sql.join(",", false)(rows.map((row) => sql`(${row.entry_id}, ${row.sequence})`))
          }) AS source (entry_id, sequence)
            ON target.entry_id = source.entry_id
            WHEN NOT MATCHED THEN
              INSERT (entry_id, sequence) VALUES (source.entry_id, source.sequence)
            OUTPUT inserted.entry_id;
          `.pipe(Effect.map((inserted) => inserted.length)),
        orElse: () =>
          sql`
            INSERT INTO ${idsTableSql} ${sql.insert(rows)}
            ON CONFLICT DO NOTHING RETURNING entry_id
          `.pipe(Effect.map((inserted) => inserted.length))
      })

    const getSessionAuthBinding = (publicKey: string) =>
      sql`
          SELECT public_key, signing_public_key
          FROM ${sessionAuthBindingsTableSql}
          WHERE public_key = ${publicKey}
        `.pipe(
        Effect.flatMap(decodeSessionAuthBindings),
        Effect.map((rows) => {
          const row = rows[0]
          return row === undefined ? undefined : row.signing_public_key as Uint8Array<ArrayBuffer>
        }),
        Effect.orDie
      )

    return EventLogServerEncrypted.Storage.of({
      getId: Effect.succeed(remoteId),
      // Auto-increment sequences start at 1.
      firstSequence: 1,
      getOrCreateSessionAuthBinding: Effect.fnUntraced(
        function*(publicKey, signingPublicKey) {
          const existing = yield* getSessionAuthBinding(publicKey)
          if (existing !== undefined) {
            return existing
          }
          return yield* sql`
            INSERT INTO ${sessionAuthBindingsTableSql} (public_key, signing_public_key)
            VALUES (${publicKey}, ${signingPublicKey})
          `.pipe(
            Effect.as(signingPublicKey)
          )
        },
        sql.withTransaction,
        withTracerDisabled,
        Effect.orDie
      ),
      write: Effect.fnUntraced(
        function*(publicKey, storeId, batches) {
          if (batches.length === 0) return []
          const scopeKey = makeEncryptedScopeKey(publicKey, storeId)
          const { idsTableSql, pubsub, semaphore, tableSql } = yield* RcMap.get(resources, scopeKey)

          const writeBatches = Effect.gen(function*() {
            const stored: Array<EventLogEncryption.EncryptedRemoteBatch> = []
            // Read before inserting ids, which record the sequence they are stored at.
            const [last] = yield* sql<{ last_sequence: number | string | null }>`
              SELECT MAX(last_sequence) AS last_sequence FROM ${tableSql}
            `
            let nextSequence = Number(last?.last_sequence ?? 0) + 1
            for (const batch of batches) {
              // Inserting the ids decides whether the batch is new. SQL Server's
              // MERGE also requires unique source ids.
              const ids = new Map<string, IdRow>()
              for (let i = 0; i < batch.entryIds.length; i++) {
                const entry_id = batch.entryIds[i]
                const key = entry_id.join(",")
                if (!ids.has(key)) ids.set(key, { entry_id, sequence: nextSequence + i })
              }
              let inserted = 0
              for (const chunk of Arr.chunksOf(ids.values(), 200)) {
                inserted += yield* insertNewIds(idsTableSql, chunk)
              }
              if (inserted === 0) continue
              const row: BatchRow = {
                sequence: nextSequence,
                last_sequence: nextSequence + batch.entryIds.length - 1,
                iv: batch.iv,
                entry_ids: concatEntryIds(batch.entryIds),
                encrypted_batch: batch.encryptedBatch
              }
              yield* sql`INSERT INTO ${tableSql} ${sql.insert(row)}`
              stored.push({ sequence: nextSequence, ...batch })
              nextSequence += batch.entryIds.length
            }
            return stored
          })

          return yield* semaphore.withPermits(1)(Effect.gen(function*() {
            const stored = yield* sql.withTransaction(writeBatches)
            yield* PubSub.publishAll(pubsub, stored)
            return stored
          }))
        },
        Effect.orDie,
        Effect.scoped,
        withTracerDisabled
      ),
      entrySequences: Effect.fnUntraced(
        function*(publicKey, storeId, entryIds) {
          const { idsTableSql } = yield* RcMap.get(resources, makeEncryptedScopeKey(publicKey, storeId))
          const acks: Array<WriteAck> = []
          for (const chunk of Arr.chunksOf(entryIds, 200)) {
            const rows = yield* sql`
              SELECT entry_id, sequence FROM ${idsTableSql} WHERE ${sql.in("entry_id", chunk)}
            `.pipe(Effect.flatMap(decodeIdRows))
            for (const row of rows) acks.push({ entryId: row.entry_id as EntryId, sequence: row.sequence })
          }
          return acks
        },
        Effect.orDie,
        Effect.scoped,
        withTracerDisabled
      ),
      changes: Effect.fnUntraced(
        function*(publicKey, storeId, startSequence) {
          const scopeKey = makeEncryptedScopeKey(publicKey, storeId)
          const { pubsub, tableSql } = yield* RcMap.get(resources, scopeKey)
          const subscription = yield* PubSub.subscribe(pubsub)
          const initial = yield* sql`
            SELECT sequence, iv, entry_ids, encrypted_batch FROM ${tableSql}
            WHERE last_sequence >= ${startSequence}
            ORDER BY sequence ASC
          `.pipe(
            Effect.flatMap(decodeBatches)
          )
          return Stream.fromArray(initial).pipe(Stream.concat(Stream.fromSubscription(subscription)))
        },
        Effect.orDie,
        withTracerDisabled,
        Stream.unwrap
      )
    })
  }).pipe(withTracerDisabled)

type IdRow = {
  readonly entry_id: Uint8Array
  readonly sequence: number
}

const decodeIdRows = Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({
  entry_id: Schema.Uint8Array,
  sequence: Schema.Number
})))

type BatchRow = {
  readonly sequence: number
  readonly last_sequence: number
  readonly iv: Uint8Array
  readonly entry_ids: Uint8Array
  readonly encrypted_batch: Uint8Array
}

const concatEntryIds = (entryIds: ReadonlyArray<Uint8Array>): Uint8Array => {
  const data = new Uint8Array(entryIds.length * 16)
  for (let i = 0; i < entryIds.length; i++) data.set(entryIds[i], i * 16)
  return data
}

const EncryptedRemoteBatchSql = Schema.Struct({
  sequence: Schema.Natural,
  iv: Schema.Uint8Array,
  entry_ids: Schema.Uint8Array,
  encrypted_batch: Schema.Uint8Array
})

type EncryptedRemoteBatchSql = Schema.Schema.Type<typeof EncryptedRemoteBatchSql>

const SessionAuthBindingSql = Schema.Struct({
  public_key: Schema.String,
  signing_public_key: Schema.Uint8Array
})

type SessionAuthBindingSql = Schema.Schema.Type<typeof SessionAuthBindingSql>

const decodeBatchRows = Schema.decodeUnknownEffect(Schema.Array(EncryptedRemoteBatchSql))
const decodeSessionAuthBindingRows = Schema.decodeUnknownEffect(Schema.Array(SessionAuthBindingSql))

const toEncryptedRemoteBatch = (row: EncryptedRemoteBatchSql): EventLogEncryption.EncryptedRemoteBatch => {
  const entryIds: Array<EntryId> = []
  for (let offset = 0; offset < row.entry_ids.byteLength; offset += 16) {
    entryIds.push(row.entry_ids.subarray(offset, offset + 16) as EntryId)
  }
  return {
    sequence: row.sequence,
    entryIds: entryIds as NonEmptyArray<EntryId>,
    iv: row.iv as Uint8Array<ArrayBuffer>,
    encryptedBatch: row.encrypted_batch as Uint8Array<ArrayBuffer>
  }
}

const decodeBatches = (
  rows: unknown
): Effect.Effect<ReadonlyArray<EventLogEncryption.EncryptedRemoteBatch>, Schema.SchemaError> =>
  decodeBatchRows(rows).pipe(Effect.map((batches) => batches.map(toEncryptedRemoteBatch)))

const decodeSessionAuthBindings = (
  rows: unknown
): Effect.Effect<ReadonlyArray<SessionAuthBindingSql>, Schema.SchemaError> => decodeSessionAuthBindingRows(rows)

/**
 * Provides encrypted server `Storage` using the SQL-backed implementation.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStorage = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
}): Layer.Layer<
  EventLogServerEncrypted.Storage,
  SqlError.SqlError,
  SqlClient.SqlClient | EventLogEncryption.EventLogEncryption
> => Layer.effect(EventLogServerEncrypted.Storage)(makeStorage(options))

/**
 * Provides SQL-backed encrypted server `Storage` and supplies the default Web
 * Crypto `EventLogEncryption` layer.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStorageSubtle = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
}): Layer.Layer<EventLogServerEncrypted.Storage, SqlError.SqlError, SqlClient.SqlClient> =>
  layerStorage(options).pipe(
    Layer.provide(EventLogEncryption.layerSubtle)
  )

const makeEncryptedScopeKey = (
  publicKey: string,
  storeId: string
): string => `${publicKey}/${storeId}`

const withTracerDisabled = Effect.withTracerEnabled(false)
