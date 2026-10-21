import { AuthPersistence } from "@effect/auth-persistence/index"
import * as Testing from "@effect/auth-persistence/Testing"
import * as Auth from "@effect/auth/Auth"
import * as EmailDelivery from "@effect/auth/EmailDelivery"
import * as Hooks from "@effect/auth/Hooks"
import * as Operations from "@effect/auth/Operations"
import * as Password from "@effect/auth/Password"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import * as Mac from "effect/crypto/Mac"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

const app = Auth.make("test/password-sign-in", {
  claims: Schema.Struct({ team: Schema.String }),
  sessions: Sessions.stateful(),
  defaultStrategy: "password",
  strategies: {
    password: Password.make({
      registration: Schema.Struct({ team: Schema.String }),
      reset: Password.resetLink({ url: "https://example.invalid/reset" })
    })
  }
})

const subjects = AuthPersistence.table({
  name: "password_subjects",
  columns: {
    id: { name: "id", type: "text" },
    active: { name: "active", type: "boolean" },
    revision: { name: "revision", type: "text" },
    team: { name: "team", type: "text" }
  },
  unique: [["id"]]
})

const persistence = AuthPersistence.make(app)
const storage = persistence.managed({
  prefix: "password_test",
  subjects: {
    table: subjects,
    id: "id",
    status: "active",
    activeValue: true,
    securityRevision: "revision",
    idCodec: SubjectId,
    requirements: () =>
      Effect.succeed({
        alternatives: [{
          factors: ["knowledge"],
          minimumCredentials: 1,
          userVerified: false,
          phishingResistant: false
        }],
        maximumAgeMillis: 60_000
      })
  }
})

const quote = (name: string) => `"${name.replaceAll("\"", "\"\"")}"`

const database = Layer.effectDiscard(
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    for (const table of [subjects, ...Object.values(storage.schema)]) {
      const columns = Object.values(table.columns).map(({ options }) =>
        `${quote(options.name)} ${options.type === "text" ? "text" : "integer"}${options.nullable ? "" : " not null"}`
      )
      const unique = table.unique.map((keys) =>
        `unique (${keys.map((key) => quote(table.columns[key].options.name)).join(", ")})`
      )
      yield* sql.unsafe(`create table ${quote(table.name)} (${[...columns, ...unique].join(", ")})`)
    }
  })
).pipe(Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })))

const base = Mac.layerWebCrypto.pipe(
  Layer.provideMerge(Testing.services()),
  Layer.merge(Hooks.LifecycleHooks.empty)
)

const registration = Layer.succeed(persistence.Provisioning, {
  password: {
    values: ({ registration }) =>
      Effect.succeed({
        id: "reader",
        active: true,
        revision: "1",
        team: registration.team
      })
  }
})

const claims = Layer.effect(
  app.strategies.password.SessionClaims,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    return {
      resolve: Effect.fnUntraced(function*({ subjectId }) {
        const rows = yield* sql<{ readonly team: string }>`select team from password_subjects where id = ${subjectId}`
          .pipe(Effect.mapError(() => Password.PasswordUnavailable.make({})))
        if (rows.length !== 1) return yield* Password.PasswordUnavailable.make({})
        return rows[0]
      })
    }
  })
)

const live = app.layer.pipe(
  Layer.provide(persistence.layer.pipe(
    Layer.provide(persistence.Config.layer(storage)),
    Layer.provide(registration)
  )),
  Layer.provide(claims),
  Layer.provide(Layer.succeed(Password.PasswordActionEvidence, {
    verify: () => Effect.fail(Password.PasswordActionRequired.make({}))
  })),
  Layer.provide(Layer.succeed(Password.CompromisedPasswords, {
    check: () => Effect.succeed({ _tag: "Allowed" as const })
  })),
  Layer.provide(Layer.succeed(EmailDelivery.EmailDelivery, {
    send: () => Effect.fail(EmailDelivery.EmailNotAccepted.make({}))
  })),
  Layer.provide(base),
  Layer.provide(database)
)

// SQLite and the authentication workflow share the live clock.
// Port of the managed password sign-in regression: real entropy must issue a usable credential.
it.live(
  "rejects wrong passwords and issues a usable session with password management enabled",
  () =>
    Effect.gen(function*() {
      const auth = yield* app
      const commands: Array<Operations.AuthCredentialCommand> = []
      const email = "reader@example.invalid"
      const password = "A manager generated regression passphrase"

      yield* Effect.gen(function*() {
        yield* auth.register({
          requestId: "uuid-regression",
          email,
          newPassword: password,
          registration: { team: "staff" }
        })

        const rejected = yield* auth.signIn({ email, password: "wrong" }).pipe(Effect.flip)
        assert.strictEqual(rejected._tag, "PasswordRejected")
        assert.deepStrictEqual(commands, [])

        const result = yield* auth.signIn({ email, password })
        assert.containsSubset(result, { _tag: "Authenticated", session: { claims: { team: "staff" } } })

        const issued = commands.find((command) => command._tag === "Issue" && command.slot === "session")
        if (issued?._tag !== "Issue") return yield* Effect.die("Missing private session credential")

        const verified = yield* auth.verifySession(issued.credential)
        assert.deepStrictEqual(verified.claims, { team: "staff" })
      }).pipe(Effect.provideService(Auth.AuthRequest, {
        credentials: {},
        invocation: Operations.guest,
        credentialCommandSink: (issued) =>
          Effect.sync(() => {
            commands.push(...issued)
          })
      }))
    }).pipe(Effect.provide(live)),
  { timeout: 30000 }
)
