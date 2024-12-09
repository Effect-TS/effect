/**
 * @since 1.0.0
 */
import * as EventJournal from "@effect/experimental/EventJournal"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Schema from "effect/Schema"
import * as Uuid from "uuid"
import * as SqlClient from "./SqlClient.js"
import type { SqlError } from "./SqlError.js"
import * as SqlSchema from "./SqlSchema.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options?: {
  readonly entryTable?: string
  readonly remotesTable?: string
}): Effect.Effect<
  typeof EventJournal.EventJournal.Service,
  SqlError,
  SqlClient.SqlClient
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    const entryTable = options?.entryTable ?? "effect_event_journal"
    const remotesTable = options?.remotesTable ?? "effect_event_remotes"

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id UUID PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BYTEA NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id BINARY(16) PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id UNIQUEIDENTIFIER PRIMARY KEY,
            event NVARCHAR(MAX) NOT NULL,
            primary_key NVARCHAR(MAX) NOT NULL,
            payload VARBINARY(MAX) NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id BLOB PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform
    })

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id UUID NOT NULL,
            entry_id UUID NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id BINARY(16) NOT NULL,
            entry_id BINARY(16) NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id UNIQUEIDENTIFIER NOT NULL,
            entry_id UNIQUEIDENTIFIER NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id BLOB NOT NULL,
            entry_id BLOB NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform
    })

    const EntrySqlEncoded = sql.onDialectOrElse({
      pg: () => EntrySqlPg,
      mysql: () => EntrySqlPg,
      mssql: () => EntrySqlPg,
      orElse: () => EntrySqlSqlite
    })

    const EntrySql = Schema.transform(
      EntrySqlEncoded,
      EventJournal.Entry,
      {
        decode(fromA) {
          return {
            id: fromA.id,
            event: fromA.event,
            primaryKey: fromA.primary_key,
            payload: fromA.payload
          }
        },
        encode(toI) {
          return {
            id: toI.id,
            event: toI.event,
            primary_key: toI.primaryKey,
            payload: toI.payload,
            timestamp: new Date(EventJournal.entryIdMillis(toI.id as EventJournal.EntryId))
          }
        }
      }
    )
    const EntrySqlArray = Schema.Array(EntrySql)
    const decodeEntrySqlArray = Schema.decodeUnknown(EntrySqlArray)

    const insertEntry = SqlSchema.void({
      Request: EntrySql,
      execute: (entry) =>
        sql`INSERT INTO ${sql(entryTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
    })
    const insertEntries = SqlSchema.void({
      Request: Schema.Array(EntrySql),
      execute: (entry) =>
        sql`INSERT INTO ${sql(entryTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
    })
    const insertRemotes = SqlSchema.void({
      Request: Schema.Array(RemoteSql),
      execute: (entry) =>
        sql`INSERT INTO ${sql(remotesTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
    })

    const pubsub = yield* PubSub.unbounded<EventJournal.Entry>()

    return EventJournal.EventJournal.of({
      entries: sql`SELECT * FROM ${sql(entryTable)} ORDER BY timestamp ASC`.withoutTransform.pipe(
        Effect.flatMap(decodeEntrySqlArray),
        Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "entries" }))
      ),
      write({ effect, event, payload, primaryKey }) {
        return Effect.gen(function*() {
          const entry = new EventJournal.Entry({
            id: EventJournal.makeEntryId(),
            event,
            primaryKey,
            payload
          }, { disableValidation: true })
          yield* insertEntry(entry)
          const value = yield* effect(entry)
          yield* pubsub.publish(entry)
          return value
        }).pipe(
          sql.withTransaction,
          Effect.mapError((cause) =>
            new EventJournal.EventJournalError({
              cause,
              method: "write"
            })
          )
        )
      },
      writeFromRemote: (options) =>
        Effect.gen(function*() {
          const entries: Array<EventJournal.Entry> = []
          const remotes: Array<typeof RemoteSql.Type> = []
          for (const remoteEntry of options.entries) {
            entries.push(remoteEntry.entry)
            remotes.push({
              remote_id: options.remoteId,
              entry_id: remoteEntry.entry.id,
              sequence: remoteEntry.remoteSequence
            })
          }
          const existingIds = new Set<string>()
          yield* sql<{ id: Uint8Array }>`SELECT id FROM ${sql(entryTable)} WHERE ${
            sql.in("id", entries.map((e) => e.id))
          }`.pipe(Effect.tap((rows) => {
            for (const row of rows) {
              existingIds.add(Uuid.stringify(row.id))
            }
          }))
          yield* insertEntries(entries)
          yield* insertRemotes(remotes)

          const uncommited = options.entries.filter((e) => !existingIds.has(e.entry.idString))
          const brackets = options.compact
            ? yield* options.compact(uncommited)
            : [[uncommited.map((_) => _.entry), uncommited] as const]
          for (const [compacted] of brackets) {
            for (let i = 0; i < compacted.length; i++) {
              const entry = compacted[i]
              const conflicts = yield* sql`
                SELECT *
                FROM ${sql(entryTable)}
                WHERE event = ${entry.event} AND
                      primary_key = ${entry.primaryKey} AND
                      timestamp >= ${entry.createdAtMillis}
                ORDER BY timestamp ASC
              `.pipe(
                Effect.flatMap(decodeEntrySqlArray)
              )
              yield* options.effect({ entry, conflicts })
            }
          }
        }).pipe(
          sql.withTransaction,
          Effect.mapError((cause) =>
            new EventJournal.EventJournalError({
              cause,
              method: "write"
            })
          )
        ),
      withRemoteUncommited: (remoteId, f) =>
        Effect.gen(function*() {
          const entries = yield* sql`
            SELECT *
            FROM ${sql(entryTable)}
            WHERE id NOT IN (SELECT entry_id FROM ${sql(remotesTable)} WHERE remote_id = ${remoteId})
            ORDER BY timestamp ASC
          `.pipe(
            Effect.flatMap(decodeEntrySqlArray)
          )
          return yield* f(entries)
        }).pipe(
          sql.withTransaction,
          Effect.mapError((cause) =>
            new EventJournal.EventJournalError({
              cause,
              method: "withRemoteUncommited"
            })
          )
        ),
      nextRemoteSequence: (remoteId) =>
        sql<{ max: number }>`SELECT MAX(sequence) AS max FROM ${sql(remotesTable)} WHERE remote_id = ${remoteId}`.pipe(
          Effect.map((rows) => Number(rows[0]!.max) + 1),
          Effect.mapError((cause) =>
            new EventJournal.EventJournalError({
              cause,
              method: "nextRemoteSequence"
            })
          )
        ),
      changes: PubSub.subscribe(pubsub),
      destroy: Effect.gen(function*() {
        yield* sql`DROP TABLE ${sql(entryTable)}`.withoutTransform
        yield* sql`DROP TABLE ${sql(remotesTable)}`.withoutTransform
      }).pipe(
        Effect.mapError((cause) => new EventJournal.EventJournalError({ cause, method: "destory" }))
      )
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: {
  readonly eventLogTable?: string
  readonly remotesTable?: string
}): Layer.Layer<EventJournal.EventJournal, SqlError, SqlClient.SqlClient> =>
  Layer.effect(EventJournal.EventJournal, make(options))

const EntrySqlPg = Schema.Struct({
  id: Schema.Uint8ArrayFromSelf,
  event: Schema.String,
  primary_key: Schema.String,
  payload: Schema.Uint8ArrayFromSelf,
  timestamp: Schema.DateFromSelf
})

const EntrySqlSqlite = Schema.Struct({
  id: Schema.Uint8ArrayFromSelf,
  event: Schema.String,
  primary_key: Schema.String,
  payload: Schema.Uint8ArrayFromSelf,
  timestamp: Schema.DateFromNumber
})

const RemoteSql = Schema.Struct({
  remote_id: EventJournal.RemoteId,
  entry_id: EventJournal.EntryId,
  sequence: Schema.Number
})
