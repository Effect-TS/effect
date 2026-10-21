import * as Auth from "@effect/auth/Auth"
import * as PhoneOtp from "@effect/auth/PhoneOtp"
import * as Proofs from "@effect/auth/Proofs"
import { SubjectId, TokenDigest } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { AuthPersistence } from "@effect/auth-persistence"

// User-requested security regression: real persistence must protect the current
// binding and keep rejected issuance from changing the live proof.
const app = Auth.make("test/proof-issuance", {
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
    yield* sql`insert into subjects values ('victim', 1, '1')`
    yield* sql`insert into proof_test_identifiers
      (namespace, value, subject_id, revision, verified_at, active)
      values ('email', 'victim@example.invalid', 'victim', '1', 0, 1)`
  })
).pipe(Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })))

const live = persistence.layer.pipe(
  Layer.provide(persistence.Config.layer(storage)),
  Layer.provide(NodeCrypto.layer),
  Layer.provideMerge(database)
)

const policy: Proofs.ProofPolicy = {
  ...Proofs.defaultProofPolicy,
  abuse: {
    ...Proofs.defaultProofPolicy.abuse,
    issues: { limit: 4, windowMillis: 3_600_000 },
    subjectIssues: { limit: 4, windowMillis: 3_600_000 },
    actionIssues: { limit: 4, windowMillis: 3_600_000 }
  }
}

const binding = (flowId: string): Proofs.ProofBinding =>
  Proofs.SubjectProofBinding.make({
    flowId,
    contextDigest: TokenDigest.make(`${flowId}-private-binding`),
    identifier: { namespace: "email", value: "victim@example.invalid" },
    revision: {
      subjectId: SubjectId.make("victim"),
      securityRevision: Sessions.SecurityRevision.make("1"),
      credentials: []
    }
  })

const issue = Effect.fnUntraced(function*(
  id: string,
  bound: Proofs.ProofBinding,
  eligible = true
) {
  const record: Proofs.ProofIssueRecord = {
    moduleId: "proof-regression",
    purpose: Proofs.ProofPurpose.make("sign-in"),
    proofId: Proofs.ProofId.make(`${id}-proof`),
    binding: bound,
    verifier: { keyId: "test", digest: TokenDigest.make(`${id}-secret-digest`) }
  }

  const prepared = yield* (yield* Proofs.ProofPersistence).issue(
    { record, lifetimeMillis: policy.lifetimeMillis, resendCooldownMillis: 30_000, eligible },
    (decision, journal) => journal.prepare(decision)
  )

  return { record, decision: yield* Proofs.readProofCommit(prepared) }
})

const redeem = Effect.fnUntraced(function*(record: Proofs.ProofIssueRecord) {
  const prepared = yield* (yield* Proofs.ProofPersistence).redeem(
    {
      moduleId: record.moduleId,
      purpose: record.purpose,
      proofId: record.proofId,
      binding: record.binding,
      candidate: record.verifier,
      maximumFailedAttempts: policy.maximumFailedAttempts
    },
    (decision, journal) => journal.prepare(decision)
  )

  return yield* Proofs.readProofCommit(prepared)
})

const advanceCooldown = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  yield* sql`update proof_test_proofs set issued_at = issued_at - 30000, expires_at = expires_at - 30000`
})

it.effect("a different binding cannot replace a live proof", () =>
  Effect.gen(function*() {
    const victim = yield* issue("victim", binding("victim"))

    assert.strictEqual(victim.decision._tag, "Issued")
    yield* advanceCooldown
    assert.strictEqual((yield* issue("attacker", binding("attacker"))).decision._tag, "Suppressed")
    assert.strictEqual(yield* redeem(victim.record), "redeemed")
  }).pipe(Effect.provide(live)))
it.effect("cooldown and eligibility protect the row until permitted reissue or redemption", () =>
  Effect.gen(function*() {
    const original = yield* issue("original", binding("victim"))

    assert.strictEqual((yield* issue("cooldown", binding("victim"))).decision._tag, "Suppressed")
    yield* advanceCooldown
    assert.strictEqual((yield* issue("ineligible", binding("victim"), false)).decision._tag, "Suppressed")
    const resent = yield* issue("resend", binding("victim"))

    assert.strictEqual(resent.decision._tag, "Issued")
    assert.strictEqual(yield* redeem(original.record), "rejected")
    assert.strictEqual(yield* redeem(resent.record), "redeemed")
    assert.strictEqual((yield* issue("after-consumption", binding("new-client"))).decision._tag, "Issued")
  }).pipe(Effect.provide(live)))
