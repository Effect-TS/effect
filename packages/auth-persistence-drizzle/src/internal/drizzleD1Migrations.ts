import { PersistenceConfigurationError, PersistenceMappingError } from "@effect/auth-persistence/Adapter"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { D1Client } from "@effect/sql-d1/D1Client"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { formatToMillis, getMigrationsToRun } from "drizzle-orm/migrator.utils"
import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

const MigrationFiles = Schema.Record(Schema.String, Schema.NonEmptyString)
const MigrationName = Schema.String.check(Schema.isPattern(/^\d{14}_.+$/))
const JournalColumns = Schema.Array(Schema.Struct({ name: Schema.String }))

const configurationError = () =>
  PersistenceConfigurationError.make({
    reason: "Could not apply D1 migrations; check the bundled SQL and database binding"
  })

const migrationFailure = (cause: unknown) => PersistenceMappingError.make({ operation: "migration", cause })

const JournalRows = Schema.Array(
  Schema.Struct({
    id: Schema.Int,
    hash: Schema.String,
    created_at: Schema.String,
    name: Schema.NullOr(Schema.String)
  })
)

/** Drizzle's D1 migration journal and selection, with bundled SQL in place of
 * filesystem loading. Pending statements and journal entries share one D1 batch.
 * Applications own when migrations run; do not run competing migration owners.
 */
export const d1MigrationsLayer = (options: {
  readonly migrations: Readonly<Record<string, string>>
  readonly migrationsTable?: string
}) =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const files = yield* Schema.decodeEffect(MigrationFiles)(options.migrations)
      const client = yield* D1Client
      const digest = yield* Digest.Digest
      const appliedAt = DateTime.formatIso(yield* DateTime.now)

      const migrations = yield* Effect.forEach(
        Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
        Effect.fnUntraced(function*([name, contents]) {
          yield* Schema.decodeEffect(MigrationName)(name)

          const folderMillis = yield* Schema.decodeEffect(Schema.Int)(
            formatToMillis(name.slice(0, 14))
          )

          const hash = yield* digest.digestHex(Digest.sha256, new TextEncoder().encode(contents))

          return {
            name,
            folderMillis,
            hash,
            sql: contents.split("--> statement-breakpoint"),
            bps: true
          }
        })
      )

      yield* Effect.gen(function*() {
        const db = drizzle(client.config.db)
        const name = options.migrationsTable ?? "__drizzle_migrations"
        const table = sql.identifier(name)

        const columns = (yield* Schema.decodeUnknownEffect(JournalColumns)(
          yield* Effect.tryPromise({
            try: () => db.all(sql`select name from pragma_table_info(${name})`),
            catch: migrationFailure
          })
        )).map((column) => column.name)

        const newDb = columns.length === 0
        const legacy = !newDb && !columns.includes("name")

        if (
          !newDb &&
          (!["id", "hash", "created_at"].every((column) => columns.includes(column)) ||
            legacy === columns.includes("applied_at"))
        ) {
          return yield* configurationError()
        }

        // Original Drizzle SQLite journals can have NULL serial IDs. Use the
        // physical rowid to backfill each retained entry without changing it.
        const journal = newDb
          ? []
          : (yield* Schema.decodeUnknownEffect(JournalRows)(
            yield* Effect.tryPromise({
              try: () =>
                db.all(sql`select rowid as id, hash, cast(created_at as text) as created_at,
              ${legacy ? sql`null` : sql`name`} as name from ${table} order by rowid`),
              catch: migrationFailure
            })
          )).map((entry) => ({ ...entry }))

        const journalStatements = newDb
          ? [
            db.run(sql`create table ${table} (
                id integer primary key, hash text not null, created_at numeric,
                name text, applied_at text
              )`)
          ]
          : []

        if (legacy) {
          // Match retained entries using Drizzle's timestamp/hash convention,
          // but stage the upgrade with pending SQL: D1 cannot run BEGIN.
          journalStatements.push(
            db.run(sql`alter table ${table} add column name text`),
            db.run(sql`alter table ${table} add column applied_at text`)
          )
          for (const entry of journal) {
            const millis = Math.floor(Number(entry.created_at) / 1000) * 1000

            const candidates = migrations.filter((migration) => migration.folderMillis === millis)

            const matches = candidates.length === 1
              ? candidates
              : (candidates.length === 0 ? migrations : candidates).filter(
                (migration) => migration.hash === entry.hash
              )

            const match = matches[0]

            if (matches.length !== 1 || match === undefined) return yield* configurationError()
            entry.name = match.name
            journalStatements.push(
              db.run(sql`update ${table} set name = ${match.name} where rowid = ${entry.id}`)
            )
          }
        }

        const statements = [
          ...journalStatements,
          ...getMigrationsToRun({
            localMigrations: migrations,
            dbMigrations: [...journal]
          }).flatMap((migration) => [
            ...migration.sql.map((statement) => db.run(sql.raw(statement))),
            db.run(sql`insert into ${table} (hash, created_at, name, applied_at)
                values (${migration.hash}, ${migration.folderMillis}, ${migration.name}, ${appliedAt})`)
          ])
        ]

        const [first, ...rest] = statements

        if (first !== undefined) {
          yield* Effect.tryPromise({
            try: () => db.batch([first, ...rest]),
            catch: migrationFailure
          })
        }
      })
    }).pipe(
      (effect) =>
        reportPersistenceFailure(effect, Schema.is(PersistenceConfigurationError), {
          markReported: true
        }),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, configurationError)))
    )
  )
