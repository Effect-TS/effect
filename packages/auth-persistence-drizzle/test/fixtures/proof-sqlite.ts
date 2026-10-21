import { makeStorageMappings } from "@effect/auth-persistence/Adapter"
import * as Auth from "@effect/auth/Auth"
import * as Email from "@effect/auth/Email"
import * as Password from "@effect/auth/Password"
import * as PhoneOtp from "@effect/auth/PhoneOtp"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { D1Client } from "@effect/sql-d1/D1Client"
import type { D1Client as D1ClientService } from "@effect/sql-d1/D1Client"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { is, type SQL, sql } from "drizzle-orm"
import * as DrizzleD1 from "drizzle-orm/effect-d1"
import { getTableConfig, integer, SQLiteColumn, type SQLiteTable, sqliteTable, text } from "drizzle-orm/sqlite-core"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type { Statement } from "effect/sql/Statement"

import { Database as D1Database } from "@effect/auth-persistence-drizzle/internal/drizzle/d1Database"
import type { ProofPersistenceMapping } from "@effect/auth-persistence-drizzle/internal/drizzle/proofModel"
import { AuthPersistence } from "@effect/auth-persistence-drizzle/SqliteNode"

const app = Auth.make("test/proof-d1", {
  claims: Schema.Struct({}),
  strategies: {
    phone: PhoneOtp.make(),
    password: Password.make(),
    email: Email.makeAddresses({
      addresses: { maximumEvidenceAgeMillis: 300_000, requireImmediateInvalidation: true }
    })
  },
  sessions: Sessions.stateful()
})

export const subjects = sqliteTable("subjects", {
  id: text().primaryKey(),
  active: integer({ mode: "boolean" }).notNull(),
  revision: text().notNull()
})

export const persistence = AuthPersistence.make(app)

export const storage = persistence.managed({
  prefix: "proof_test",
  subjects: {
    table: subjects,
    id: "id",
    status: "active",
    activeValue: true,
    securityRevision: "revision",
    idCodec: SubjectId,
    requirements: () =>
      Effect.succeed({
        alternatives: [
          {
            factors: ["possession"],
            minimumCredentials: 1,
            userVerified: false,
            phishingResistant: false
          }
        ],
        maximumAgeMillis: 60_000
      })
  }
})

// Use production codecs and table mapping, rather than a test proof-store implementation.
export const proofMapping = Effect.flatMap(makeStorageMappings(storage), (mappings) => mappings.proofs())

const clock = sql`(select now from proof_clock)`

export const d1Mapping = Effect.map(
  proofMapping,
  (mapping) =>
    ({
      ...mapping,
      d1: { primary: true },
      clock: {
        ...mapping.clock,
        engineNowMillis: clock,
        toMillis: (value: SQL) => value,
        fromMillis: (value: SQL) => value
      }
    }) as unknown as ProofPersistenceMapping<SQLiteTable, SQLiteTable, string>
)

const quote = (name: string) => "\"" + name.replaceAll("\"", "\"\"") + "\""

export const database = Layer.effectDiscard(
  Effect.gen(function*() {
    const client = yield* SqlClient.SqlClient

    for (const table of [subjects, ...Object.values(storage.schema)]) {
      const config = getTableConfig(table)

      const columns = config.columns.map(
        (column) =>
          `${quote(column.name)} ${column.getSQLType()}${column.notNull ? " not null" : ""}${
            column.primary ? " primary key" : ""
          }`
      )

      const indexes = config.indexes.map((index) => {
        const names = index.config.columns.map((column) => {
          if (!is(column, SQLiteColumn)) throw new Error("Fixture requires plain-column indexes")

          return quote(column.name)
        })

        return `unique (${names.join(", ")})`
      })

      yield* client.unsafe(
        `create table ${quote(config.name)} (${[...columns, ...indexes].join(", ")})`
      )
    }
    yield* client`create table proof_clock (now integer not null)`
    yield* client`insert into proof_clock values (0)`
  })
).pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })),
  Layer.provideMerge(NodeCrypto.layer)
)

/** Only the SQL transport differs: production D1 planning and generated batch SQL
 * run unchanged, in a real atomic SQLite transaction. The callback introduces a
 * competing committed writer immediately before that transaction begins. */
export const makeD1Transport = Effect.fnUntraced(function*(
  beforeBatch: Effect.Effect<void, SqlError, SqlClient.SqlClient> = Effect.void
): Effect.fn.Return<D1ClientService, never, SqlClient.SqlClient> {
  const client = yield* SqlClient.SqlClient

  const batch = (statements: ReadonlyArray<Statement<unknown>>) =>
    beforeBatch.pipe(
      Effect.andThen(
        client.withTransaction(
          Effect.forEach(statements, (statement) => statement, { concurrency: 1 })
        )
      ),
      Effect.provideService(SqlClient.SqlClient, client)
    )

  const unsupported = Effect.die("transactions are not supported in D1")

  const transport: SqlClient.SqlClient & { readonly batch: typeof batch } = Object.assign(
    client.bind(undefined),
    client,
    {
      batch,
      withTransaction: () => unsupported,
      reserve: unsupported,
      withoutTransforms: () => transport
    }
  )

  // Keep SQLite's transaction owner private to batches; D1 views cannot recover it.
  Object.assign(transport, { safe: transport })

  return transport as unknown as D1ClientService
})

export const d1Database = (
  beforeBatch: Effect.Effect<void, SqlError, SqlClient.SqlClient> = Effect.void
) =>
  Layer.effect(
    D1Database,
    Effect.gen(function*() {
      const transport = yield* makeD1Transport(beforeBatch)

      return yield* DrizzleD1.makeWithDefaults({}).pipe(Effect.provideService(D1Client, transport))
    })
  ).pipe(Layer.provideMerge(database))
