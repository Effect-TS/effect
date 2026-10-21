import { AuthPersistence } from "@effect/auth-persistence"
import * as Auth from "@effect/auth/Auth"
import * as Password from "@effect/auth/Password"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const App = Auth.make("raw-consumer", {
  claims: Schema.Struct({}),
  strategies: { password: Password.make() },
  sessions: Sessions.stateful()
})

const subjects = AuthPersistence.table({
  name: "customers",
  columns: {
    id: { name: "id", type: "text" },
    active: { name: "active", type: "boolean" },
    revision: { name: "revision", type: "text" }
  },
  unique: [["id"]]
})

export const Persistence = AuthPersistence.make(App)

export const storage = Persistence.managed({
  prefix: "auth_qioX37kywXU_",
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
            factors: ["knowledge"],
            minimumCredentials: 1,
            userVerified: false,
            phishingResistant: false
          }
        ],
        maximumAgeMillis: 60_000
      })
  }
})

export const passwordTable = storage.schema.passwords
