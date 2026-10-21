import * as Hooks from "@effect/auth/Hooks"
import * as Proofs from "@effect/auth/Proofs"
import { TokenDigest } from "@effect/auth/Schema"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { makeProofPersistenceServices } from "@effect/auth-persistence-drizzle/D1"
import { d1Database, d1Mapping } from "./fixtures/proof-sqlite.ts"

// User-requested independent D1 regression: execute the production planner and
// atomic batch SQL, including a competing write between planning and commit.
const policy: Proofs.ProofPolicy = {
  ...Proofs.defaultProofPolicy,
  abuse: {
    ...Proofs.defaultProofPolicy.abuse,
    resendCooldownMillis: 0,
    issues: { limit: 2, windowMillis: 3_600_000 },
    actionIssues: { limit: 2, windowMillis: 3_600_000 }
  }
}

const record = (id: string, flowId: string): Proofs.ProofIssueRecord => ({
  moduleId: "d1-proof-regression",
  purpose: Proofs.ProofPurpose.make("registration"),
  proofId: Proofs.ProofId.make(`${id}-proof`),
  binding: Proofs.IdentifierProofBinding.make({
    flowId,
    contextDigest: TokenDigest.make(`${flowId}-private-binding`),
    identifier: { namespace: "email", value: "new@example.invalid" }
  }),
  verifier: { keyId: "test", digest: TokenDigest.make(`${id}-secret-digest`) }
})

const issue = Effect.fnUntraced(function*(
  value: Proofs.ProofIssueRecord,
  options: { readonly eligible?: boolean } = {}
) {
  const { proofPersistence } = yield* makeProofPersistenceServices(yield* d1Mapping)

  const prepared = yield* proofPersistence.issue(
    {
      record: value,
      lifetimeMillis: policy.lifetimeMillis,
      resendCooldownMillis: 0,
      eligible: options.eligible ?? true
    },
    (decision, journal) => journal.prepare(decision)
  )

  return yield* Proofs.readProofCommit(prepared)
})

it.effect("D1 preserves the live binding and replaces only an eligible same-flow proof", () =>
  Effect.gen(function*() {
    const original = record("victim", "victim")

    assert.strictEqual((yield* issue(original))._tag, "Issued")
    assert.strictEqual((yield* issue(record("attacker", "attacker")))._tag, "Suppressed")
    assert.strictEqual((yield* issue(record("ineligible", "victim"), { eligible: false }))._tag, "Suppressed")
    assert.strictEqual((yield* issue(record("resend", "victim")))._tag, "Issued")
    const sql = yield* SqlClient.SqlClient

    const generations = yield* sql`select proof_id from proof_test_proofs`

    assert.deepStrictEqual(generations, [{ proof_id: "resend-proof" }])
  }).pipe(Effect.provide([d1Database(), Hooks.LifecycleHooks.empty])))

it.effect("D1 rejects a planned reissue when another live binding wins before batch commit", () => {
  let interfere = false

  const beforeBatch = Effect.gen(function*() {
    if (!interfere) return
    interfere = false
    const sql = yield* SqlClient.SqlClient

    // A different binding won the series after the advisory planning read.
    const replacement = record("replacement", "replacement")

    const binding = Schema.encodeSync(Schema.fromJsonString(Proofs.ProofBinding))(
      replacement.binding
    )

    yield* sql`update proof_test_proofs set proof_id = ${replacement.proofId}, binding = ${binding}, verifier_digest = ${replacement.verifier.digest}`
  })

  return Effect.gen(function*() {
    const original = record("victim", "victim")

    yield* issue(original)
    interfere = true
    const raced = yield* issue(record("raced", "victim")).pipe(Effect.result)

    assert.strictEqual(raced._tag, "Failure")
    const sql = yield* SqlClient.SqlClient

    assert.deepStrictEqual(yield* sql`select proof_id from proof_test_proofs`, [
      { proof_id: "replacement-proof" }
    ])
  }).pipe(Effect.provide([d1Database(beforeBatch), Hooks.LifecycleHooks.empty]))
})
