import { makeStorageMappings } from "@effect/auth-persistence/Adapter"
import * as Auth from "@effect/auth/Auth"
import * as Email from "@effect/auth/Email"
import * as Hooks from "@effect/auth/Hooks"
import * as Proofs from "@effect/auth/Proofs"
import { TokenDigest } from "@effect/auth/Schema"
import { assert, it } from "@effect/vitest"
import { getTableColumns, sql } from "drizzle-orm"
import type { SQLiteTable } from "drizzle-orm/sqlite-core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import * as D1 from "@effect/auth-persistence-drizzle/D1"
import {
  type EmailRegistrationMapping,
  requiredEmailRegistrationConstraints
} from "@effect/auth-persistence-drizzle/internal/drizzle/emailModel"
import { PersistenceMappingError } from "@effect/auth-persistence-drizzle/internal/drizzle/model"
import * as Sqlite from "@effect/auth-persistence-drizzle/SqliteNode"
import type { subjects } from "./fixtures/proof-sqlite.ts"
import { d1Database, d1Mapping, database, storage } from "./fixtures/proof-sqlite.ts"

// User-requested finding 3 regression: real proof issuance/attempt and public raw
// registration authority, including the independently compiled D1 atomic batch.
const Registration = Schema.Struct({ displayName: Schema.String })

const moduleId = "mailbox"

const { RegistrationAuthority } = Auth.make("test/email-registration", {
  claims: Registration,
  strategies: {
    registration: Email.makeRegistration({ namespace: moduleId, registration: Registration })
  }
}).strategies.registration

const identifier = { namespace: "email", value: "owner@example.invalid" }
const fingerprint = TokenDigest.make("owner-registration")
const columns = getTableColumns(storage.schema.identifiers)

const mappings = Effect.gen(function*() {
  const email = yield* (yield* makeStorageMappings(storage)).emails()
  const d1 = yield* d1Mapping

  const proofMapping = d1

  const mapping = {
    mode: "atomic",
    ...email,
    d1: d1.d1,
    clock: d1.clock,
    subject: { ...email.subject, activeStatusValue: true },
    identifier: {
      ...email.identifier,
      d1MutableTargetCondition: (input: {
        identifier: { namespace: string; value: string }
        nativeSubjectId: string
      }) =>
        sql`${columns.namespace} = ${input.identifier.namespace} and ${columns.value} = ${input.identifier.value} and ${columns.subjectId} = ${input.nativeSubjectId} and ${columns.active} = 1 and ${columns.verifiedAt} is null`,
      d1CurrentCondition: (input: {
        identifier: { namespace: string; value: string }
        nativeSubjectId: string
        bindingRevision: string
      }) =>
        sql`${columns.namespace} = ${input.identifier.namespace} and ${columns.value} = ${input.identifier.value}
        and ${columns.subjectId} = ${input.nativeSubjectId} and ${columns.revision} = ${input.bindingRevision}
        and ${columns.active} = 1 and ${columns.verifiedAt} is not null`
    },
    credential: { ...email.credential, activeStatusValue: true },
    authorityCredential: { ...email.authorityCredential, activeStatusValue: true },
    constraints: requiredEmailRegistrationConstraints,
    inspect: () => Effect.succeed({ fingerprint, eligible: true }),
    snapshotRegistration: (value: typeof Registration.Type) =>
      Schema.decodeEffect(Registration)(value).pipe(
        Effect.mapError((cause) => PersistenceMappingError.make({ operation: "mapping", cause }))
      ),
    isIdentifierConflict: (cause: unknown) =>
      cause instanceof Error &&
      cause.message.includes("UNIQUE constraint failed: proof_test_identifiers"),
    provisioning: {
      idMode: "synchronous",
      allocateSubjectIdSync: () => "mailbox-owner",
      encodeSubjectInsert: (
        _input: unknown,
        values: { nativeSubjectId: string; securityRevision: string }
      ) => ({
        id: values.nativeSubjectId,
        active: true,
        revision: values.securityRevision
      })
    }
    // Production shared mappings erase table types; these are the same concrete
    // Drizzle tables. No persisted value crosses a schema through this adapter cast.
  } as unknown as EmailRegistrationMapping<
    typeof Registration.Type,
    typeof subjects,
    SQLiteTable,
    SQLiteTable,
    SQLiteTable,
    string
  >

  return { mapping, proofMapping }
})

const seed = Effect.gen(function*() {
  const client = yield* SqlClient.SqlClient

  yield* client`create table application_data (subject_id text primary key, contents text not null)`
  yield* client`insert into subjects values ('squatter', 1, 'old-security')`
  yield* client`insert into application_data values ('squatter', 'attacker-owned data')`
  yield* client`insert into proof_test_identifiers
    (namespace, value, subject_id, revision, verified_at, active)
    values ('email', 'owner@example.invalid', 'squatter', 'old-binding', null, 1)`
  yield* client`insert into proof_test_credentials (credential_id, subject_id, revision, active)
    values ('attacker-password', 'squatter', 'old-password', 1)`
  yield* client`insert into proof_test_passwords
    (module_id, subject_id, credential_id, credential_revision, verifier_version, verifier, normalization)
    values ('password', 'squatter', 'attacker-password', 'old-password', 'old-verifier', 'opaque-attacker-verifier', 'none')`
})

const services = Effect.fnUntraced(function*(mode: "interactive" | "d1") {
  const { mapping, proofMapping } = yield* mappings

  return yield* mode === "d1"
    ? Effect.all({
      registration: D1.makeEmailRegistrationServices(mapping, proofMapping),
      proofs: D1.makeProofPersistenceServices(proofMapping)
    })
    : Effect.all({
      registration: Sqlite.makeEmailRegistrationServices(mapping, proofMapping),
      proofs: Sqlite.makeProofPersistenceServices(proofMapping)
    })
})

const redemption = Effect.gen(function*() {
  const store = yield* Proofs.ProofPersistence

  const record: Proofs.ProofIssueRecord = {
    moduleId: `${moduleId}/registration`,
    purpose: Proofs.ProofPurpose.make("email-code-registration"),
    proofId: Proofs.ProofId.make("mailbox-proof"),
    binding: Proofs.IdentifierProofBinding.make({
      identifier,
      flowId: "registration-flow",
      contextDigest: TokenDigest.make("private-flow-binding")
    }),
    verifier: { keyId: "key", digest: TokenDigest.make("correct-secret-digest") }
  }

  const issued = yield* store.issue(
    { record, eligible: true, lifetimeMillis: 300_000, resendCooldownMillis: 0 },
    (value, journal) => journal.prepare(value)
  )

  assert.strictEqual((yield* issued.read)._tag, "Issued")

  return {
    input: {
      moduleId: record.moduleId,
      purpose: record.purpose,
      proofId: record.proofId,
      binding: record.binding,
      candidate: record.verifier,
      maximumFailedAttempts: 5
    },
    prepare: (decision, journal, project) => journal.prepare(project(decision))
  } satisfies Proofs.ProofRedemptionPlan
})

const complete = Effect.fnUntraced(function*(plan: Proofs.ProofRedemptionPlan) {
  const authority = yield* RegistrationAuthority

  const prepared = yield* authority.registerWithProof(
    {
      moduleId,
      commandId: Email.EmailCommandId.make("register-owner"),
      identifier,
      registration: { displayName: "Mailbox owner" },
      fingerprint,
      requestId: `email-registration:${moduleId}:${plan.input.proofId}`,
      redemption: plan
    },
    (value, journal) => journal.prepare(value)
  )

  return yield* prepared.read
})

const state = Effect.gen(function*() {
  const client = yield* SqlClient.SqlClient

  return {
    subjects: yield* client`select * from subjects order by id`,
    identifier: yield* client`select * from proof_test_identifiers`,
    passwords: yield* client`select * from proof_test_passwords`,
    data: yield* client`select * from application_data`,
    credentials: yield* client`select * from proof_test_credentials order by credential_id`,
    email: yield* client`select * from proof_test_emailCredentials`,
    proofs: yield* client`select proof_id from proof_test_proofs`
  }
})

const layers = (mode: "interactive" | "d1", beforeBatch?: Parameters<typeof d1Database>[0]) =>
  Layer.effectContext(
    Effect.gen(function*() {
      yield* seed
      const { registration, proofs } = yield* services(mode)

      return Context.make(RegistrationAuthority, registration.registrationAuthority).pipe(
        Context.add(Proofs.ProofPersistence, proofs.proofPersistence)
      )
    })
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        Sqlite.databaseLayer.pipe(Layer.provideMerge(database)),
        d1Database(beforeBatch),
        Hooks.LifecycleHooks.empty
      )
    )
  )

it.effect.each(
  [
    { mode: "interactive", disabled: false },
    { mode: "d1", disabled: false },
    { mode: "interactive", disabled: true },
    { mode: "d1", disabled: true }
  ] as const
)(
  "$mode mailbox registration replaces only the unverified binding (disabled prior subject: $disabled)",
  ({ mode, disabled }) =>
    Effect.gen(function*() {
      if (disabled) {
        const client = yield* SqlClient.SqlClient

        yield* client`update subjects set active = 0 where id = 'squatter'`
      }
      const completion = yield* redemption
      const before = yield* state

      assert.strictEqual((yield* complete(completion))._tag, "Registered")
      const after = yield* state

      assert.containsSubset(after.identifier[0], {
        subject_id: "mailbox-owner",
        verified_at: 0,
        active: 1
      })
      assert.notStrictEqual(after.identifier[0]!.revision, "old-binding")
      assert.notStrictEqual(after.subjects.find((row) => row.id === "squatter")!.revision, "old-security")
      assert.strictEqual(after.subjects.find((row) => row.id === "squatter")!.active, disabled ? 0 : 1)
      assert.deepStrictEqual(after.subjects.map((row) => row.id), ["mailbox-owner", "squatter"])
      assert.deepStrictEqual(after.data, before.data)
      assert.deepStrictEqual(after.passwords, before.passwords)
      assert.deepInclude(after.credentials, before.credentials[0])
      assert.lengthOf(after.email, 1)
      assert.strictEqual(after.email[0]!.subject_id, "mailbox-owner")
      assert.deepStrictEqual(after.proofs, [])
      assert.strictEqual((yield* complete(completion))._tag, "Rejected")
      assert.deepStrictEqual(yield* state, after)
    }).pipe(Effect.provide(layers(mode)))
)

it.effect.each(["interactive", "d1"] as const)(
  "%s protected-write failure preserves the old subject and usable proof",
  (mode) =>
    Effect.gen(function*() {
      const completion = yield* redemption
      const before = yield* state
      const client = yield* SqlClient.SqlClient

      yield* client`create trigger reject_email before insert on proof_test_emailCredentials begin select raise(abort, 'protected-write failure'); end`
      assert.strictEqual((yield* complete(completion).pipe(Effect.result))._tag, "Failure")
      assert.deepStrictEqual(yield* state, before)
      yield* client`drop trigger reject_email`
      assert.strictEqual((yield* complete(completion))._tag, "Registered")
    }).pipe(Effect.provide(layers(mode)))
)

it.effect("D1 rejects a verified binding committed after registration planning", () => {
  let interfere = false

  const beforeBatch = Effect.gen(function*() {
    if (!interfere) return
    interfere = false
    const client = yield* SqlClient.SqlClient

    yield* client`update proof_test_identifiers set verified_at = 1, revision = 'verified-binding'`
  })

  return Effect.gen(function*() {
    const completion = yield* redemption

    interfere = true

    const result = yield* complete(completion).pipe(Effect.result)

    assert.isTrue(result._tag === "Failure" || result.success._tag === "Rejected")
    const saved = yield* state

    assert.deepStrictEqual(saved.subjects, [{ id: "squatter", active: 1, revision: "old-security" }])
    assert.containsSubset(saved.identifier[0], {
      subject_id: "squatter",
      verified_at: 1,
      revision: "verified-binding"
    })
    assert.deepStrictEqual(saved.email, [])
    assert.deepStrictEqual(saved.proofs, [{ proof_id: "mailbox-proof" }])
  }).pipe(Effect.provide(layers("d1", beforeBatch)))
})
