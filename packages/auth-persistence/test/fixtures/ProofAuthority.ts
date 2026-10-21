import * as Auth from "@effect/auth/Auth"
import * as PhoneOtp from "@effect/auth/PhoneOtp"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { AuthPersistence } from "@effect/auth-persistence"

const app = Auth.make("test/proof-delivery", {
  claims: Schema.Struct({}),
  strategies: { phone: PhoneOtp.make() },
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

const persistence = AuthPersistence.make(app)

const storage = persistence.managed({
  prefix: "proof_delivery",
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

const quote = (name: string) => "\"" + name.replaceAll("\"", "\"\"") + "\""

const database = Layer.effectDiscard(
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    for (const table of [subjects, ...Object.values(storage.schema)]) {
      const columns = Object.values(table.columns).map(
        ({ options }) =>
          `${quote(options.name)} ${options.type === "text" ? "text" : "integer"}${options.nullable ? "" : " not null"}`
      )

      const unique = table.unique.map(
        (keys) => `unique (${keys.map((key) => quote(table.columns[key].options.name)).join(", ")})`
      )

      yield* sql.unsafe(
        `create table ${quote(table.name)} (${[...columns, ...unique].join(", ")})`
      )
    }
  })
).pipe(Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })))

export const authority = persistence.layer.pipe(
  Layer.provide(persistence.Config.layer(storage)),
  Layer.provideMerge(database)
)
