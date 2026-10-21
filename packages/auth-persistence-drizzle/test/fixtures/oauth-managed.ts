import type { PersistenceApi } from "@effect/auth-persistence/Adapter"
import * as Auth from "@effect/auth/Auth"
import * as OAuth from "@effect/auth/OAuth"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { D1Client } from "@effect/sql-d1/D1Client"
import * as PgliteClient from "@effect/sql-pglite/PgliteClient"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert } from "@effect/vitest"
import { getTableColumns, getTableName, is } from "drizzle-orm"
import * as Pg from "drizzle-orm/pg-core"
import * as Sqlite from "drizzle-orm/sqlite-core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"

import { AuthPersistence as D1Persistence } from "@effect/auth-persistence-drizzle/D1"
import { AuthPersistence as PglitePersistence } from "@effect/auth-persistence-drizzle/Pglite"
import { AuthPersistence as SqlitePersistence } from "@effect/auth-persistence-drizzle/SqliteNode"
import { makeD1Transport } from "./proof-sqlite.ts"

export const profile = Schema.decodeSync(OAuth.OAuthConnectedProfile)({
  key: "strava/activity",
  generation: 1,
  issuance: "active",
  provider: "strava",
  clientRegistrationId: "fitness",
  scopes: ["activity:read"],
  resources: [],
  retention: "access-and-refresh",
  maximumAccessLifetimeMillis: 3_600_000,
  maximumRefreshLifetimeMillis: 86_400_000,
  refreshAheadMillis: 0,
  refresh: "rotating",
  revocation: "provider"
})

export const Fitness = Auth.make("test/fitness", {
  claims: Schema.Struct({ displayName: Schema.String }),
  sessions: Sessions.stateful({ maxAge: "30 days" }),
  strategies: { strava: OAuth.make({ namespace: "strava/oauth" }) },
  defaultStrategy: "strava"
})

export const StatelessFitness = Auth.make("test/fitness", {
  claims: Schema.Struct({ displayName: Schema.String }),
  sessions: Sessions.stateless(),
  strategies: { strava: OAuth.make({ namespace: "strava/oauth" }) },
  defaultStrategy: "strava"
})

export const RetainedFitness = Auth.make("test/fitness", {
  claims: Schema.Struct({ displayName: Schema.String }),
  sessions: Sessions.stateful({ maxAge: "30 days" }),
  strategies: { strava: OAuth.make({ namespace: "strava/oauth", access: profile }) },
  defaultStrategy: "strava"
})

export const requirement = Sessions.AuthenticationRequirement.make({
  alternatives: [
    {
      factors: ["possession"],
      minimumCredentials: 1,
      userVerified: false,
      phishingResistant: false
    }
  ],
  maximumAgeMillis: 300_000
})

export const identity = Schema.decodeSync(OAuth.OAuthExternalIdentity)({
  provider: "strava",
  issuer: "https://www.strava.com",
  subject: "athlete-123"
})

export const configuration = Schema.decodeSync(OAuth.OAuthProtocolConfiguration)({
  provider: "strava",
  protocol: "oauth",
  configurationGeneration: 1,
  issuer: identity.issuer,
  responseIssuerMode: "unsupported",
  callbackId: "strava",
  redirectUri: "https://fitness.example/auth/strava/callback"
})

export type Backend = "sqlite" | "d1" | "pglite"
export type SessionMode = "stateful" | "stateless"
type ManagedTable = Sqlite.SQLiteTable | Pg.PgTable

const sqliteSubjects = Sqlite.sqliteTable("athletes", {
  id: Sqlite.text().primaryKey(),
  active: Sqlite.integer({ mode: "boolean" }).notNull(),
  revision: Sqlite.text().notNull()
})

const pgSubjects = Pg.pgTable("athletes", {
  id: Pg.text().primaryKey(),
  active: Pg.boolean().notNull(),
  revision: Pg.text().notNull()
})

function managed<T extends ManagedTable, R>(
  api: PersistenceApi<T, R>,
  subjects: T,
  retained: boolean,
  sessionMode: SessionMode
) {
  let auth: typeof Fitness | typeof RetainedFitness | typeof StatelessFitness = Fitness

  if (retained) auth = RetainedFitness
  else if (sessionMode === "stateless") auth = StatelessFitness
  const persistence = api.make(auth)

  const storage = persistence.managed({
    prefix: "auth",
    subjects: {
      table: subjects,
      id: "id",
      status: "active",
      activeValue: true,
      securityRevision: "revision",
      idCodec: SubjectId,
      requirements: () => Effect.succeed(requirement)
    }
  })

  return {
    subjects,
    schema: storage.schema,
    layer: persistence.layer.pipe(Layer.provide(persistence.Config.layer(storage)))
  }
}

function quote(name: string): string {
  return "\"" + name.replaceAll("\"", "\"\"") + "\""
}

const migrate = Effect.fnUntraced(function*(
  tables: ReadonlyArray<ManagedTable>
): Effect.fn.Return<void, SqlError, SqlClient.SqlClient> {
  const client = yield* SqlClient.SqlClient

  for (const table of tables) {
    const config = is(table, Sqlite.SQLiteTable)
      ? Sqlite.getTableConfig(table)
      : Pg.getTableConfig(table)

    const columns = config.columns.map(
      (column) =>
        `${quote(column.name)} ${column.getSQLType()}${column.notNull ? " not null" : ""}${
          column.primary ? " primary key" : ""
        }`
    )

    const indexes = config.indexes.map((index) => {
      const names = index.config.columns.map((column) => {
        if (!is(column, Sqlite.SQLiteColumn) && !is(column, Pg.IndexedColumn)) {
          throw new Error("Managed fixture requires plain-column indexes")
        }

        return quote(column.name)
      })

      return `unique (${names.join(", ")})`
    })

    yield* client.unsafe(
      `create table ${quote(config.name)} (${[...columns, ...indexes].join(", ")})`
    )
  }
})

const insert = Effect.fnUntraced(function*(
  table: ManagedTable,
  row: Readonly<Record<string, string | boolean>>
): Effect.fn.Return<void, SqlError, SqlClient.SqlClient> {
  const client = yield* SqlClient.SqlClient
  const columns = getTableColumns(table)

  const values = Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const column = columns[key]

      if (column === undefined) throw new Error(`Missing managed column ${key}`)

      return [column.name, column.mapToDriverValue(value)]
    })
  )

  yield* client`insert into ${client(getTableName(table))} ${client.insert(values)}`
})

export function requiredService<I, S, R>(context: Context.Context<R>, key: Context.Key<I, S>): S {
  const service = Context.getOrUndefined(context, key)

  assert.isDefined(service, `Composed persistence must provide ${key.key}`)
  if (service === undefined) throw new Error(`Missing composed service ${key.key}`)

  return service
}

export const setup = Effect.fnUntraced(function*(
  backend: Backend,
  retained = false,
  sessionMode: SessionMode = "stateful",
  seedLogin = true
) {
  let batches = 0

  const sqlite = SqliteClient.layer({ filename: ":memory:" })

  const d1 = Layer.effectContext(
    makeD1Transport(
      Effect.sync(() => {
        batches++
      })
    ).pipe(
      Effect.map((client) => Context.make(D1Client, client).pipe(Context.add(SqlClient.SqlClient, client)))
    )
  ).pipe(Layer.provide(sqlite))

  const selected = backend === "d1" ? d1 : sqlite

  const config = backend === "pglite"
    ? managed(PglitePersistence, pgSubjects, retained, sessionMode)
    : managed(
      backend === "d1" ? D1Persistence : SqlitePersistence,
      sqliteSubjects,
      retained,
      sessionMode
    )

  const database = backend === "pglite" ? PgliteClient.layer({}) : selected

  const context = yield* Layer.build(
    config.layer.pipe(Layer.provideMerge(database), Layer.provideMerge(NodeCrypto.layer))
  )

  const schema: Readonly<Record<string, ManagedTable>> = config.schema

  yield* migrate([config.subjects, ...Object.values(schema)]).pipe(Effect.provide(context))
  if (sessionMode === "stateless") assert.notInclude(Object.keys(schema), "sessions")
  const signIn = requiredService(context, OAuth.OAuthSignInPersistence)

  assert.includeMembers(
    Object.keys(schema),
    [
      "oauthIdentities",
      "oauthCredentials",
      "oauthSignInFlows",
      ...(retained
        ? ["oauthConnectedFlows", "oauthConnectedGrants", "oauthConnectedRevocations"]
        : [])
    ]
  )
  if (!retained) assert.notProperty(schema, "oauthConnectedGrants")

  // Application-owned provisioning links an existing athlete; OAuth sign-in never creates one.
  const identityKey = "v1:iyWgFQ3vG56vfcppZpRiIVe3z1trpaZWbObqVTNxEqY"

  function table(role: string): ManagedTable {
    const value = schema[role]

    if (value === undefined) throw new Error(`Missing managed role ${role}`)

    return value
  }

  yield* Effect.gen(function*() {
    yield* insert(config.subjects, { id: "athlete", active: true, revision: "subject-v1" })
    if (!seedLogin) return
    yield* insert(table("credentials"), {
      credentialId: "strava-login",
      subjectId: "athlete",
      revision: "credential-v1",
      active: true
    })
    yield* insert(table("oauthIdentities"), {
      identityKey,
      provider: identity.provider,
      issuer: identity.issuer,
      externalSubject: identity.subject,
      subjectId: "athlete"
    })
    yield* insert(table("oauthCredentials"), {
      moduleId: "strava/oauth",
      credentialId: "strava-login",
      subjectId: "athlete",
      identityKey,
      credentialRevision: "credential-v1",
      active: true
    })
  }).pipe(Effect.provide(context))

  return {
    context,
    signIn,
    table,
    assertBatchExecution: () => {
      if (backend === "d1") assert.isAbove(batches, 0)
    }
  }
})
