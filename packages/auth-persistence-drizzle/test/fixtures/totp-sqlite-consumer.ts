import { createHmac } from "node:crypto"

import { SubjectId } from "@effect/auth/Schema"
import { AuthenticationEvidence, AuthenticationFlowId, AuthenticationRequirement } from "@effect/auth/Sessions"
import {
  base32,
  TotpActionChallenge,
  TotpCryptography,
  TotpPersistence,
  TotpPolicy,
  type TotpRecord,
  TotpSecretKeys,
  type TotpSnapshot
} from "@effect/auth/Totp"
import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { SqlClient } from "effect/sql/SqlClient"

import { requiredTotpConstraints, type TotpMapping } from "@effect/auth-persistence-drizzle/internal/drizzle/totpModel"

// Consumer schema and migration. No package-owned table or migration is installed.
export const subjects = sqliteTable("totp_example_subjects", {
  id: text().primaryKey(),
  revision: text().notNull(),
  active: integer({ mode: "boolean" }).notNull(),
  totpEnabled: integer({ mode: "boolean" }).notNull()
})

export const factors = sqliteTable("totp_example_factors", {
  scope: text().primaryKey(),
  state: text().notNull(),
  version: text().notNull()
})

export const credentials = sqliteTable("totp_example_credentials", {
  id: text().primaryKey(),
  subjectId: text().notNull(),
  revision: text().notNull(),
  active: integer({ mode: "boolean" }).notNull()
})

export const policy = TotpPolicy.make({
  issuer: "Example",
  enrollmentLifetimeMillis: 300000,
  revealLifetimeMillis: 60000,
  clockSkewSteps: 1,
  attemptLimit: 5,
  attemptWindowMillis: 60000,
  maximumEvidenceAgeMillis: 60000,
  allowRecoveryCodeForPending: true,
  lostFactorRecovery: "reset-with-recovery-code",
  requireImmediateInvalidation: false
})

export const mapping = {
  moduleId: "example/totp",
  policy,
  constraints: requiredTotpConstraints,
  subjectIds: { toNative: (id: SubjectId) => String(id), toSubject: SubjectId.make },
  subject: {
    table: subjects,
    id: "id",
    securityRevision: "revision",
    factorEnabled: "totpEnabled",
    activeCondition: sql`${subjects.active} = 1`,
    encodeEnabled: (enabled: boolean) => enabled,
    decodeRequirement: () =>
      AuthenticationRequirement.make({
        maximumAgeMillis: 60000,
        alternatives: [
          {
            factors: ["possession"],
            minimumCredentials: 1,
            userVerified: true,
            phishingResistant: true
          }
        ]
      })
  },
  factor: {
    table: factors,
    scope: "scope",
    state: "state",
    version: "version",
    encodeInsert: (value) => value
  },
  credential: {
    table: credentials,
    id: "id",
    subjectId: "subjectId",
    revision: "revision",
    status: "active",
    activeCondition: sql`${credentials.active} = 1`,
    encodeStatus: (active: boolean) => active,
    encodeInsert: (value) => ({
      id: value.credentialId,
      subjectId: value.subjectId,
      revision: value.revision,
      active: value.active
    })
  },
  engineNowMillis: sql`cast(round((julianday('now') - 2440587.5) * 86400000) as integer)`
} satisfies TotpMapping<typeof subjects, typeof factors, typeof credentials, string>

export const migrate = Effect.gen(function*() {
  const client = yield* SqlClient

  yield* client`create table totp_example_subjects (id text primary key, revision text not null, active integer not null, totpEnabled integer not null)`
  yield* client`create table totp_example_factors (scope text primary key, state text not null, version text not null)`
  yield* client`create table totp_example_credentials (id text primary key, subjectId text not null, revision text not null, active integer not null)`
  yield* client`insert into totp_example_subjects values ('account-1','security-1',1,0)`
  yield* client`insert into totp_example_credentials values ('verified-passkey','account-1','passkey-1',1)`
})

/** This example's passkey stands for the consumer's already independently verified
 * fresh action evidence. Production wires TotpActionEvidence to its verified
 * action service; clients never submit AuthenticationEvidence as operation input. */
export const useAuthenticator = Effect.gen(function*() {
  const persistence = yield* TotpPersistence

  const {
    decryptSecret,
    digest,
    encryptSecret,
    generateSecret,
    matchCode,
    newRecoveryCodes,
    randomId
  } = yield* TotpCryptography

  // Independent platform oracle for the authenticator's displayed code.
  const codeAt = (secret: Uint8Array, step: number) => {
    const counter = new Uint8Array(8)

    new DataView(counter.buffer).setBigUint64(0, BigInt(step), false)
    const mac = createHmac("sha1", secret).update(counter).digest()
    const offset = mac[mac.length - 1]! & 15

    return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0")
  }

  const subjectId = SubjectId.make("account-1"),
    moduleId = mapping.moduleId

  const current = Effect.fn("TotpExample.current")(function*() {
    const value = yield* persistence.snapshot({ moduleId, subjectId })

    if (value === undefined) throw new Error("Missing example account")

    return value
  })

  const action = Effect.fn("TotpExample.action")(function*(
    snapshot: TotpSnapshot,
    kind: typeof TotpActionChallenge.Type.action,
    commandId: string
  ) {
    const challenge = TotpActionChallenge.make({
      moduleId,
      action: kind,
      commandId,
      flowId: AuthenticationFlowId.make(commandId),
      bindingDigest: yield* digest(commandId),
      revision: snapshot.revision
    })

    return {
      challenge,
      requirement: mapping.subject.decodeRequirement(),
      evidence: AuthenticationEvidence.make({
        flowId: challenge.flowId,
        bindingDigest: challenge.bindingDigest,
        revision: snapshot.revision,
        proofs: [
          {
            method: "passkey",
            credentialId: "verified-passkey",
            factors: ["possession"],
            userVerified: true,
            phishingResistant: true,
            verifiedAt: yield* DateTime.now
          }
        ]
      })
    }
  })

  const mutate = Effect.fn("TotpExample.mutate")(function*(
    snapshot: TotpSnapshot,
    change: Parameters<TotpPersistence["Service"]["mutate"]>[0]["action"],
    management?: typeof TotpActionChallenge.Type.action
  ) {
    const commandId = yield* randomId(),
      authorization = management === undefined ? undefined : yield* action(snapshot, management, commandId)

    const receipt = yield* persistence.mutate(
      {
        snapshot,
        moduleId,
        subjectId,
        policy,
        action: change,
        ...(authorization === undefined ? {} : { authorization })
      },
      (value, journal) => journal.prepare(value)
    )

    return yield* receipt.read
  })

  const initial = yield* current(),
    now = DateTime.toEpochMillis(yield* DateTime.now),
    secret = yield* generateSecret(),
    credentialId = yield* randomId(),
    revision = yield* randomId(),
    enrollmentId = yield* randomId()

  const envelope = yield* encryptSecret({ moduleId, subjectId, credentialId, revision }, secret)

  const record: TotpRecord = {
    moduleId,
    subjectId,
    credentialId,
    revision,
    version: yield* randomId(),
    secret: null,
    pending: {
      revision,
      enrollmentId,
      secret: envelope,
      expiresAtMillis: now + policy.enrollmentLifetimeMillis,
      failedAttempts: 0
    },
    recoveryDigests: [],
    acceptedStep: -1,
    failedAttempts: 0,
    attemptWindow: now
  }

  const enrolled = yield* mutate(initial, { _tag: "Enroll", record }, "enroll")

  if (enrolled._tag !== "Accepted") throw new Error("Enrollment was rejected")
  const pending = yield* current()

  if (pending.record?.secret !== null) throw new Error("Pending enrollment enabled the factor")

  const wrong = yield* mutate(
    pending,
    {
      _tag: "Confirm",
      enrollmentId,
      matchedStep: null,
      recoveryDigests: (yield* newRecoveryCodes(moduleId, subjectId)).digests
    },
    "confirm"
  )

  if (wrong._tag !== "Rejected" || (yield* current()).record?.pending?.failedAttempts !== 1) {
    throw new Error("Invalid confirmation did not persist its attempt")
  }

  const codes = yield* newRecoveryCodes(moduleId, subjectId),
    step = Math.floor(DateTime.toEpochMillis(yield* DateTime.now) / 30000),
    displayed = codeAt(secret, step)

  const confirmed = yield* mutate(
    yield* current(),
    {
      _tag: "Confirm",
      enrollmentId,
      matchedStep: yield* matchCode(secret, displayed, step * 30000, policy.clockSkewSteps),
      recoveryDigests: codes.digests
    },
    "confirm"
  )

  if (confirmed._tag !== "Accepted") throw new Error("Confirmation rejected")
  const enabled = yield* current()

  if (
    enabled.record === null ||
    enabled.record.secret === null ||
    enabled.revision.securityRevision === initial.revision.securityRevision
  ) {
    throw new Error("Confirmation did not enable and revise account")
  }
  const plaintext = yield* decryptSecret({ moduleId, subjectId, credentialId, revision }, envelope)

  if (base32(plaintext) !== base32(secret)) throw new Error("Encrypted secret did not roundtrip")
  plaintext.fill(0)
  secret.fill(0)
  const replay = yield* mutate(enabled, { _tag: "Verify", matchedStep: step })

  if (replay._tag !== "Rejected") throw new Error("TOTP replay was accepted")

  const recoverySnapshot = yield* current(),
    request = { _tag: "Recovery" as const, digest: codes.digests[0]!, reset: false }

  const recovery = yield* mutate(recoverySnapshot, request),
    reuse = yield* mutate(yield* current(), request)

  if (recovery._tag !== "Accepted" || reuse._tag !== "Rejected") {
    throw new Error("Recovery code was not single use")
  }

  const regenerated = yield* mutate(
    yield* current(),
    { _tag: "Regenerate", recoveryDigests: (yield* newRecoveryCodes(moduleId, subjectId)).digests },
    "regenerate"
  )

  if (regenerated._tag !== "Accepted") throw new Error("Recovery regeneration was rejected")
  const disabled = yield* mutate(yield* current(), { _tag: "Disable" }, "disable")

  if (
    disabled._tag !== "Accepted" ||
    disabled.record.secret !== null ||
    disabled.record.recoveryDigests.length !== 0
  ) {
    throw new Error("Disable retained a factor or code")
  }

  return {
    enrollment: "confirmed",
    replay: "rejected",
    recovery: "single-use",
    regeneration: "completed",
    disable: "completed"
  }
})

/** Supply a persisted secret from the consumer's key manager in real applications. */
export const exampleKeys = TotpSecretKeys.of({
  current: Effect.succeed({
    keyId: "example-key",
    key: Redacted.make(new Uint8Array(32).fill(71))
  }),
  get: () => Effect.succeed(Redacted.make(new Uint8Array(32).fill(71)))
})
