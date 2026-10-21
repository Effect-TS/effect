import { AuthPersistence } from "@effect/auth-persistence"
import * as Adapter from "@effect/auth-persistence/Adapter"
import * as Passkey from "@effect/auth/Passkey"
import { SubjectId } from "@effect/auth/Schema"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

export const moduleId = "test/passkey-clock"

const table = (
  name: string,
  text: ReadonlyArray<string>,
  integers: ReadonlyArray<string> = [],
  booleans: ReadonlyArray<string> = []
) =>
  AuthPersistence.table({
    name,
    columns: Object.fromEntries([
      ...text.map((name) => [name, { name, type: "text" as const }]),
      ...integers.map((name) => [name, { name, type: "integer" as const, nullable: name === "lastUsedAt" }]),
      ...booleans.map((name) => [name, { name, type: "boolean" as const }])
    ]),
    unique: []
  })

const subject = table("passkey_subject", ["id", "status", "securityRevision", "name"])
const factor = table("passkey_factor", ["subjectId", "credentialId", "revision", "status"])
const credential = table(
  "passkey_credential",
  [
    "credentialId",
    "subjectId",
    "rpId",
    "protocolCredentialId",
    "credentialKey",
    "userHandle",
    "publicKey",
    "profile",
    "credentialRevision",
    "status",
    "name"
  ],
  ["algorithm", "counter", "createdAt", "lastUsedAt"],
  ["primarySignIn", "enrollmentUserVerified", "backupEligible", "backupState"]
)
const flow = table("passkey_flow", ["moduleId", "flowId", "purpose", "snapshot", "requestBindingVerifier"], [
  "requestBindingExpiresAt",
  "issuedAt",
  "expiresAt"
])

export const profile = Passkey.PasskeyProfile.make({
  profileId: "primary",
  rpId: "localhost",
  rpName: "Passkey clock test",
  origins: ["http://localhost:4179"],
  developmentLocalhost: true,
  residentKey: "required",
  userVerification: "required",
  primarySignIn: true,
  attestation: "none",
  algorithms: [-7, -257]
})

export const policy = Passkey.PasskeyMethodPolicy.make({
  profiles: [profile],
  lifetimeMillis: 120000,
  admission: {
    global: { limit: 1000, windowMillis: 60000 },
    subject: { limit: 100, windowMillis: 60000 },
    target: { limit: 100, windowMillis: 60000 }
  }
})

export const management = Passkey.PasskeyManagementPolicy.make({
  maximumCredentials: 5,
  maximumEvidenceAgeMillis: 120000,
  requireImmediateInvalidation: false
})

export const requirement = Passkey.PasskeyRequirement.make({
  maximumAgeMillis: 120000,
  alternatives: [
    { factors: ["possession"], minimumCredentials: 1, userVerified: true, phishingResistant: true }
  ]
})

const profileCodec = Schema.fromJsonString(Passkey.PasskeyProfile)
const active = (value: unknown) => value === "active"

export const services = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const tables = Adapter.makeNativeSqlTables(sql)
  const read: Adapter.PasskeyNativeRead = {
    subject: {
      table: subject,
      id: "id",
      status: "status",
      securityRevision: "securityRevision",
      decodeId: (row) => row.id,
      decodeRequirement: () => Effect.succeed(requirement),
      isActiveStatus: active,
      activeCondition: sql`passkey_subject.status = 'active'`
    },
    credential: {
      table: credential,
      credentialId: "credentialId",
      subjectId: "subjectId",
      rpId: "rpId",
      protocolCredentialId: "protocolCredentialId",
      credentialKey: "credentialKey",
      userHandle: "userHandle",
      publicKey: "publicKey",
      algorithm: "algorithm",
      profile: "profile",
      credentialRevision: "credentialRevision",
      status: "status",
      primarySignIn: "primarySignIn",
      enrollmentUserVerified: "enrollmentUserVerified",
      backupEligible: "backupEligible",
      backupState: "backupState",
      counter: "counter",
      decode: (row) =>
        Schema.decodeUnknownSync(
          Passkey.PasskeyCredential.mapFields(
            ({ revision: _revision, active: _active, requirement: _requirement, ...fields }) => fields
          )
        )({ ...row, profile: Schema.decodeUnknownSync(profileCodec)(row.profile) }),
      decodeSubjectId: (row) => row.subjectId,
      isActiveStatus: active,
      activeCondition: sql`passkey_credential.status = 'active'`
    },
    authority: {
      table: factor,
      subjectId: "subjectId",
      credentialId: "credentialId",
      revision: "revision",
      status: "status",
      isActiveStatus: active,
      activeCondition: sql`passkey_factor.status = 'active'`
    },
    subjectIds: {
      toNative: (id) => String(id),
      toSubject: Schema.decodeUnknownSync(SubjectId),
      equals: Object.is
    },
    constraints: Adapter.requiredPasskeyCredentialConstraints
  }

  const mapping: Adapter.NativePasskeyManagementMapping = {
    moduleId,
    read,
    flow: {
      table: flow,
      moduleId: "moduleId",
      flowId: "flowId",
      purpose: "purpose",
      snapshot: "snapshot",
      requestBindingVerifier: "requestBindingVerifier",
      requestBindingExpiresAt: "requestBindingExpiresAt",
      issuedAt: "issuedAt",
      expiresAt: "expiresAt",
      encodeInsert: () => ({})
    },
    clock: {
      encodeInstant: (millis) => millis,
      decodeInstant: Schema.decodeUnknownSync(Schema.Int),
      engineNowMillis: sql`(SELECT millis FROM passkey_test_clock)`,
      toMillis: (expression: Fragment) => expression,
      fromMillis: (expression: Fragment) => expression
    },
    telemetry: {
      lastUsedAt: "lastUsedAt",
      encodeBackupState: (value) => value,
      encodeBackupEligible: (value) => value
    },
    constraints: Adapter.requiredPasskeyPersistenceConstraints,
    write: {
      credential: {
        name: "name",
        createdAt: "createdAt",
        encodeInsert: ({ credential, subjectId, summary, marker }) => ({
          credentialId: credential.credentialId,
          rpId: credential.rpId,
          protocolCredentialId: credential.protocolCredentialId,
          userHandle: credential.userHandle,
          algorithm: credential.algorithm,
          primarySignIn: credential.primarySignIn,
          enrollmentUserVerified: credential.enrollmentUserVerified,
          backupEligible: credential.backupEligible,
          backupState: credential.backupState,
          counter: credential.counter,
          subjectId,
          profile: Schema.encodeSync(profileCodec)(credential.profile),
          publicKey: credential.publicKey,
          credentialRevision: marker,
          credentialKey: "",
          status: "active",
          name: summary.name,
          createdAt: summary.createdAtMillis
        }),
        encodePrimarySignIn: (value) => value,
        encodeEnrollmentUserVerified: (value) => value,
        encodeBackupEligible: (value) => value,
        activeStatus: "active",
        removedStatus: "removed"
      },
      authority: {
        encodeInsert: ({ subjectId, credential, marker }) => ({
          subjectId,
          credentialId: credential.credentialId,
          revision: marker,
          status: "active"
        }),
        activeStatus: "active",
        removedStatus: "removed"
      },
      policy: {
        subjectColumns: ["name"],
        management: () => management,
        requirement: () => Effect.succeed(requirement),
        metadata: (id) => sql`exists(select 1 from passkey_subject where id = ${id} and status = 'active')`,
        action: () => sql`1 = 1`,
        remainingSignIn: (id, excluded) =>
          Effect.succeed(
            sql`exists(select 1 from passkey_credential where subjectId = ${id} and credentialId <> ${excluded} and status = 'active' and primarySignIn = 1 and enrollmentUserVerified = 1)`
          )
      }
    },
    invalidation: {
      window: {
        trigger: "credential-change",
        existingSessions: "immediate",
        maximumExposureMillis: 0,
        oldAuthenticationEvidence: "rejected"
      },
      mutations: ["passkey_session", "passkey_pending"].map((name) =>
        Adapter.passkeyInvalidationMutation({
          table: table(name, ["id", "subjectId", "revision", "status"]),
          where: ({ subjectId }: { readonly subjectId: unknown }) =>
            sql`${sql(name)}.subjectId = ${subjectId} and ${sql(name)}.status = 'active'`,
          values: () => ({ status: "revoked" }),
          postcondition: ({ subjectId }: { readonly subjectId: unknown }) =>
            sql`not exists(select 1 from ${sql(name)} where subjectId = ${subjectId} and status = 'active')`
        })
      ),
      postcondition: ({ subjectId, securityRevision }) =>
        sql`exists(select 1 from passkey_subject where id = ${subjectId} and securityRevision = ${securityRevision})`
    }
  }

  const base = yield* Adapter.makeNativePasskeyServices(tables, mapping)
  return {
    passkeyPersistence: base.passkeyPersistence,
    passkeyManagementPersistence: Adapter.makePasskeyNativeManagement(base, mapping).passkeyManagementPersistence,
    passkeyCredentials: base.passkeyCredentials
  }
})

export const migrate = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  for (
    const ddl of [
      "create table passkey_subject (id text primary key, status text not null, securityRevision text not null, name text not null)",
      "create table passkey_factor (subjectId text not null, credentialId text primary key, revision text not null, status text not null)",
      "create table passkey_credential (credentialId text primary key, subjectId text not null, rpId text not null, protocolCredentialId text not null, credentialKey text not null unique, userHandle text not null, publicKey text not null, algorithm integer not null, profile text not null, credentialRevision text not null, status text not null, primarySignIn integer not null, enrollmentUserVerified integer not null, backupEligible integer not null, backupState integer not null, counter integer not null, name text not null, createdAt integer not null, lastUsedAt integer)",
      "create table passkey_flow (moduleId text not null, flowId text primary key, purpose text not null, snapshot text not null, requestBindingVerifier text not null, requestBindingExpiresAt integer not null, issuedAt integer not null, expiresAt integer not null)",
      "create table passkey_session (id text primary key, subjectId text not null, revision text not null, status text not null)",
      "create table passkey_pending (id text primary key, subjectId text not null, revision text not null, status text not null)"
    ]
  ) yield* sql.unsafe(ddl)
})
