import * as Auth from "@effect/auth/Auth"
import * as OAuth from "@effect/auth/OAuth"
import * as Password from "@effect/auth/Password"
import { hooksLayer } from "@effect/auth/Persistence"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import { ConnectionError, SqlError } from "effect/sql/SqlError"
import * as Statement from "effect/sql/Statement"

import { AuthPersistence } from "@effect/auth-persistence"
import * as OAuthPersistence from "@effect/auth-persistence/OAuthPersistence"

const app = Auth.make("test/request-sql", {
  claims: Schema.Struct({}),
  strategies: { password: Password.make() },
  sessions: Sessions.stateful()
})

const subjects = AuthPersistence.table({
  name: "subjects",
  columns: {
    id: { name: "id", type: "text" },
    active: { name: "active", type: "boolean" },
    revision: { name: "revision", type: "text" }
  },
  unique: [["id"]]
})

const requirement = Sessions.AuthenticationRequirement.make({
  alternatives: [
    {
      factors: ["knowledge"],
      minimumCredentials: 1,
      userVerified: false,
      phishingResistant: false
    }
  ],
  maximumAgeMillis: 60_000
})

const persistence = AuthPersistence.make(app)

const storage = persistence.managed({
  prefix: "request_auth",
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

const quote = (name: string) => "\"" + name.replaceAll("\"", "\"\"") + "\""

const migrate = Effect.fnUntraced(function*(revision: string) {
  const sql = yield* SqlClient.SqlClient

  for (const table of [subjects, ...Object.values(storage.schema)]) {
    const columns = Object.values(table.columns).map(
      ({ options }) =>
        `${quote(options.name)} ${options.type === "text" ? "text" : "integer"}${options.nullable ? "" : " not null"}`
    )

    const keys = table.unique.map(
      (key) => `unique (${key.map((name) => quote(table.columns[name].options.name)).join(", ")})`
    )

    yield* sql.unsafe(`create table ${quote(table.name)} (${[...columns, ...keys].join(", ")})`)
  }
  yield* sql`insert into subjects values ('member', 1, ${revision})`
})

const RequestClient = Context.Reference<SqlClient.SqlClient | undefined>("test/RequestClient", {
  defaultValue: () => undefined
})

const requestSql = Layer.effect(
  SqlClient.SqlClient,
  SqlClient.make({
    driver: "test-sqlite",
    compiler: Statement.makeCompilerSqlite(),
    spanAttributes: [],
    acquirer: Effect.gen(function*() {
      const client = yield* RequestClient

      if (client === undefined) {
        return yield* SqlError.make({
          reason: ConnectionError.make({ cause: "No request SQL client" })
        })
      }

      return yield* client.reserve
    })
  })
).pipe(Layer.provide(Reactivity.layer))

const capture = Effect.flatMap(
  Sessions.AuthenticationAuthority,
  (authority) => authority.capture(SubjectId.make("member"), [])
)

// https://github.com/yielded-dev/auth/issues/200: the first lazy build dropped
// request services; subsequent operations must also use their own connection.
it.effect("preserves request-local SQL during initialization and across concurrent requests", () =>
  Effect.gen(function*() {
    const first = yield* SqliteClient.make({ filename: ":memory:" })
    const second = yield* SqliteClient.make({ filename: ":memory:" })

    yield* migrate("first").pipe(Effect.provideService(SqlClient.SqlClient, first))
    yield* migrate("second").pipe(Effect.provideService(SqlClient.SqlClient, second))

    const services = yield* Layer.build(
      persistence.layer.pipe(
        Layer.provide(persistence.Config.layer(storage)),
        Layer.provide(requestSql),
        Layer.provide(NodeCrypto.layer)
      )
    )

    const read = (client: SqlClient.SqlClient) =>
      capture.pipe(Effect.provide(services), Effect.provideService(RequestClient, client))

    assert.strictEqual((yield* read(first)).revision.securityRevision, "first")
    const results = yield* Effect.all([read(first), read(second)], { concurrency: 2 })

    assert.deepStrictEqual(results.map((result) => result.revision.securityRevision), ["first", "second"])
    assert.strictEqual((yield* capture.pipe(Effect.provide(services), Effect.result))._tag, "Failure")
  }).pipe(Effect.provide(Reactivity.layer)))

const ownership = OAuthPersistence.table({
  name: "ownership",
  columns: {
    identityKey: { name: "identity_key", type: "text" },
    subjectId: { name: "subject_id", type: "text" },
    provider: { name: "provider", type: "text" },
    issuer: { name: "issuer", type: "text" },
    externalSubject: { name: "external_subject", type: "text" }
  },
  unique: [["identityKey"]]
})

const intents = OAuthPersistence.table({
  name: "intents",
  columns: {
    moduleId: { name: "module_id", type: "text" },
    reference: { name: "reference", type: "text" },
    flowId: { name: "flow_id", type: "text" },
    identityKey: { name: "identity_key", type: "text", nullable: true },
    snapshot: { name: "snapshot", type: "text", nullable: true },
    expiresAt: { name: "expires_at", type: "integer", nullable: true },
    retentionUntil: { name: "retention_until", type: "integer", nullable: true }
  },
  unique: [
    ["moduleId", "reference"],
    ["moduleId", "flowId"]
  ]
})

const mapping = {
  ownership: {
    table: ownership,
    identityKey: "identityKey",
    subjectId: "subjectId",
    provider: "provider",
    issuer: "issuer",
    externalSubject: "externalSubject",
    decodeSubjectId: (row) => String(row.subjectId)
  },
  intent: {
    table: intents,
    moduleId: "moduleId",
    reference: "reference",
    flowId: "flowId",
    identityKey: "identityKey",
    snapshot: "snapshot",
    expiresAt: "expiresAt",
    retentionUntil: "retentionUntil",
    encodeInsert: () => ({})
  },
  clock: OAuthPersistence.clock,
  constraints: {
    ownership: "unique(ownership.identityKey)",
    intentReference: "unique(intent.moduleId,intent.reference)",
    intentFlow: "unique(intent.moduleId,intent.flowId)"
  },
  eligible: () => OAuthPersistence.sql`true`
} satisfies OAuthPersistence.OAuthRegistrationIntentMapping<
  typeof ownership,
  typeof intents,
  string
>

// The explicit-constructor failure from the same issue occurs before a request
// exists. Exercise real writes so removing or bypassing validation cannot pass.
it.live(
  "defers explicit OAuth SQL to the request while validating and retaining commit ownership",
  () =>
    Effect.gen(function*() {
      const first = yield* SqliteClient.make({ filename: ":memory:" })
      const second = yield* SqliteClient.make({ filename: ":memory:" })
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const reactivity = yield* Reactivity.Reactivity

      // 284f08ba retained a construction-time transaction during lazy OAuth setup.
      // Closing each physical connection on release makes expiration deterministic.
      const reconnecting = yield* SqlClient.make({
        driver: "test-sqlite",
        compiler: Statement.makeCompilerSqlite(),
        spanAttributes: [],
        acquirer: SqliteClient.make({ filename: `${directory}/oauth.sqlite` }).pipe(
          Effect.flatMap((client) => client.reserve),
          Effect.provideService(Reactivity.Reactivity, reactivity)
        )
      })

      for (const client of [first, second, reconnecting]) {
        yield* client`create table ownership (identity_key text, subject_id text, provider text, issuer text, external_subject text)`
        yield* client`create table intents (module_id text, reference text, flow_id text, identity_key text, snapshot text, expires_at integer, retention_until integer, unique(module_id, reference), unique(module_id, flow_id))`
      }

      const dependencies = yield* Layer.build(
        Layer.mergeAll(requestSql, NodeCrypto.layer, hooksLayer)
      )

      const construct = OAuthPersistence.makeOAuthRegistrationIntentServices(mapping).pipe(
        Effect.provide(dependencies)
      )

      const invalid = yield* construct
      const now = yield* Clock.currentTimeMillis

      const intent = yield* Schema.decodeEffect(OAuth.OAuthRegistrationIntent)({
        namespace: "effect-auth/oauth-registration-intent/v1",
        reference: "A".repeat(43),
        context: {
          namespace: "effect-auth/oauth-sign-in-context/v1",
          moduleId: "request/oauth",
          generation: 1,
          flowId: "registration",
          provider: "example",
          protocol: "oauth",
          configurationGeneration: 1,
          issuer: "https://provider.example",
          responseIssuerMode: "unsupported",
          callbackId: "example",
          redirectUri: "https://app.example/callback",
          returnTarget: "/",
          stateDigest: "A".repeat(43),
          requestBindingVerifier: "B".repeat(43),
          requestBindingExpiresAtMillis: now + 300_000,
          issuedAtMillis: now,
          expiresAtMillis: now + 300_000,
          exchangeTimeoutMillis: 30_000
        },
        identity: { provider: "example", issuer: "https://provider.example", subject: "member" },
        verifiedAtMillis: now,
        credentialDigest: "A".repeat(43),
        issuedAtMillis: now,
        expiresAtMillis: now + 60_000,
        retentionUntilMillis: now + 300_000
      })

      const issue = (service: OAuth.OAuthRegistrationIntents["Service"]) =>
        service.issue({ intent }, (value, journal) => journal.prepare(value))

      // A missing physical ownership key must still stop the first write.
      assert.containsSubset(
        yield* issue(invalid.oauthRegistrationIntents).pipe(
          Effect.provideService(RequestClient, first),
          Effect.result
        ),
        { _tag: "Failure", failure: { _tag: "OAuthUnavailable" } }
      )
      assert.deepStrictEqual(yield* first`select count(*) as count from intents`, [{ count: 0 }])
      for (const client of [first, second, reconnecting]) {
        yield* client`create unique index ownership_identity on ownership (identity_key)`
      }

      const valid = yield* construct
      const logical = Context.get(dependencies, SqlClient.SqlClient)

      // First use inside an unrelated transaction must not bind the shared service.
      assert.containsSubset(
        yield* issue(valid.oauthRegistrationIntents).pipe(
          logical.withTransaction,
          Effect.provideService(RequestClient, first),
          Effect.result
        ),
        { _tag: "Failure", failure: { _tag: "OAuthUnavailable" } }
      )

      const decisions = yield* Effect.all(
        [first, second].map((client) =>
          issue(valid.oauthRegistrationIntents).pipe(
            Effect.flatMap((receipt) => receipt.read),
            Effect.provideService(RequestClient, client)
          )
        ),
        { concurrency: 2 }
      )

      assert.deepStrictEqual(decisions.map((decision) => decision._tag), [
        "RegistrationIssued",
        "RegistrationIssued"
      ])
      for (const client of [first, second]) {
        assert.deepStrictEqual(yield* client`select count(*) as count from intents`, [{ count: 1 }])
      }

      const constructedInTransaction = yield* OAuthPersistence.makeOAuthRegistrationIntentServices(
        mapping
      ).pipe(
        Effect.provideService(SqlClient.SqlClient, reconnecting),
        Effect.provide(dependencies),
        reconnecting.withTransaction
      )

      assert.strictEqual(
        (yield* issue(constructedInTransaction.oauthRegistrationIntents).pipe(
          Effect.flatMap((receipt) => receipt.read)
        ))._tag,
        "RegistrationIssued"
      )
      assert.deepStrictEqual(yield* reconnecting`select count(*) as count from intents`, [{ count: 1 }])

      const coordinatedIntent = yield* Schema.decodeUnknownEffect(
        Schema.toType(OAuth.OAuthRegistrationIntent)
      )({
        ...intent,
        reference: "C".repeat(43),
        context: { ...intent.context, flowId: "coordinated" }
      })

      const coordinated = yield* OAuthPersistence.coordinateOAuthRegistrationIntents(
        { mapping },
        Effect.gen(function*() {
          const service = yield* OAuth.OAuthRegistrationIntents

          const receipt = yield* service.issue(
            { intent: coordinatedIntent },
            (value, journal) => journal.prepare(value)
          )

          return { service, receipt }
        })
      ).pipe(Effect.provide(dependencies), Effect.provideService(RequestClient, first))

      assert.strictEqual((yield* coordinated.receipt.read)._tag, "RegistrationIssued")
      assert.containsSubset(
        yield* issue(coordinated.service).pipe(
          Effect.provideService(RequestClient, first),
          Effect.result
        ),
        { _tag: "Failure", failure: { _tag: "OAuthUnavailable" } }
      )
    }).pipe(Effect.provide([Reactivity.layer, NodeFileSystem.layer]))
)
