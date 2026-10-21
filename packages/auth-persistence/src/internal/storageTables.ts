import * as Schema from "effect/Schema"

export const StorageTable = Schema.Struct({
  name: Schema.NonEmptyString,
  schema: Schema.optionalKey(Schema.NonEmptyString),
  columns: Schema.Record(
    Schema.String,
    Schema.Struct({
      name: Schema.NonEmptyString,
      type: Schema.Literals(["text", "integer", "boolean"]),
      nullable: Schema.optionalKey(Schema.Boolean)
    })
  ),
  unique: Schema.Array(Schema.Array(Schema.String)),
  /** Non-unique access paths for migration tooling, not acquisition requirements. */
  indexes: Schema.optionalKey(Schema.Array(Schema.Array(Schema.String)))
})

export type StorageTable = typeof StorageTable.Type

const text = { type: "text" as const }
const integer = { type: "integer" as const }
const boolean = { type: "boolean" as const }
const optionalText = { ...text, nullable: true }
const optionalInteger = { ...integer, nullable: true }

const spec = <C extends Readonly<Record<string, Omit<StorageTable["columns"][string], "name">>>>(
  columns: C,
  unique: ReadonlyArray<ReadonlyArray<Extract<keyof C, string>>>,
  indexes: ReadonlyArray<ReadonlyArray<Extract<keyof C, string>>> = []
) => ({ columns, unique, indexes })

const oauthFlow = spec(
  {
    moduleId: text,
    flowId: text,
    purpose: text,
    generation: integer,
    provider: text,
    callbackId: text,
    issuer: text,
    responseIssuerMode: text,
    subjectId: optionalText,
    stateDigest: text,
    binderVerifier: text,
    binderExpiresAt: integer,
    snapshot: text,
    issuedAt: integer,
    expiresAt: integer
  },
  [["moduleId", "flowId"], ["stateDigest"]]
)

/** Logical roles are independent of table names and migration ownership. */
export const storageTables = {
  subjects: spec({ id: text, active: boolean, securityRevision: text }, [["id"]]),
  identifiers: spec(
    {
      namespace: text,
      value: text,
      moduleId: optionalText,
      credentialId: optionalText,
      subjectId: text,
      revision: text,
      verifiedAt: optionalInteger,
      active: boolean
    },
    [["namespace", "value"]],
    [["subjectId", "namespace", "value"]]
  ),
  credentials: spec(
    { credentialId: text, subjectId: text, revision: text, active: boolean },
    [["credentialId"]],
    [["subjectId", "active", "credentialId"]]
  ),
  passwords: spec(
    {
      moduleId: text,
      subjectId: text,
      credentialId: text,
      credentialRevision: text,
      verifierVersion: text,
      verifier: text,
      normalization: text
    },
    [
      ["moduleId", "subjectId"],
      ["moduleId", "credentialId"]
    ]
  ),
  emailCredentials: spec(
    {
      moduleId: text,
      subjectId: text,
      credentialId: text,
      identifierNamespace: text,
      identifierValue: text,
      credentialRevision: text,
      active: boolean
    },
    [
      ["moduleId", "credentialId"],
      ["moduleId", "identifierNamespace", "identifierValue"]
    ]
  ),
  passkeyCredentials: spec(
    {
      credentialId: text,
      subjectId: text,
      rpId: text,
      protocolCredentialId: text,
      credentialKey: text,
      userHandle: text,
      publicKey: text,
      algorithm: integer,
      profile: text,
      credentialRevision: text,
      active: boolean,
      primarySignIn: boolean,
      enrollmentUserVerified: boolean,
      backupEligible: boolean,
      backupState: boolean,
      counter: integer,
      name: text,
      createdAt: integer,
      lastUsedAt: optionalInteger
    },
    [["credentialId"], ["credentialKey"]]
  ),
  passkeyFlows: spec(
    {
      moduleId: text,
      flowId: text,
      purpose: text,
      snapshot: text,
      requestBindingVerifier: text,
      requestBindingExpiresAt: integer,
      issuedAt: integer,
      expiresAt: integer
    },
    [["moduleId", "flowId"]]
  ),
  oauthIdentities: spec(
    { identityKey: text, provider: text, issuer: text, externalSubject: text, subjectId: text },
    [["identityKey"]]
  ),
  oauthCredentials: spec(
    {
      moduleId: text,
      credentialId: text,
      subjectId: text,
      identityKey: text,
      credentialRevision: text,
      active: boolean
    },
    [["credentialId"], ["identityKey"]]
  ),
  oauthSignInFlows: oauthFlow,
  oauthConnectedFlows: oauthFlow,
  oauthConnectedGrants: spec(
    {
      moduleId: text,
      grantId: text,
      subjectId: text,
      identityKey: text,
      profileKey: text,
      grantVersion: text,
      tokenVersion: text,
      state: text,
      snapshot: text,
      summary: text,
      refreshClaimId: optionalText,
      refreshNextTokenVersion: optionalText,
      refreshClaimedAt: optionalInteger,
      refreshClaimExpiresAt: optionalInteger,
      expiresAt: integer
    },
    [
      ["moduleId", "grantId"],
      ["moduleId", "subjectId", "profileKey", "identityKey"]
    ]
  ),
  oauthConnectedRevocations: spec(
    {
      jobId: text,
      moduleId: text,
      subjectId: text,
      identityKey: text,
      snapshot: text,
      state: text,
      claimId: optionalText,
      claimedAt: optionalInteger,
      claimExpiresAt: optionalInteger,
      retentionUntil: integer
    },
    [["jobId"]]
  ),
  proofs: spec(
    {
      moduleId: text,
      purpose: text,
      seriesKey: text,
      proofId: text,
      binding: text,
      verifierKeyId: text,
      verifierDigest: text,
      issuedAt: integer,
      expiresAt: integer,
      failedAttempts: integer
    },
    [
      ["moduleId", "purpose", "seriesKey"],
      ["moduleId", "proofId"]
    ]
  ),
  sessions: spec(
    {
      sessionId: text,
      subjectId: text,
      digest: text,
      securityRevision: text,
      issuedAt: integer,
      expiresAt: integer,
      absoluteExpiresAt: integer,
      record: text
    },
    [["sessionId"], ["digest"]],
    [["subjectId", "securityRevision", "sessionId"]]
  ),
  pending: spec(
    {
      moduleId: text,
      kind: text,
      digest: text,
      version: text,
      flowId: text,
      subjectId: text,
      bindingDigest: text,
      snapshot: text,
      expiresAt: integer,
      attemptLimit: integer,
      failedAttempts: integer,
      consumed: boolean
    },
    [["digest"]],
    [["moduleId", "expiresAt", "digest"]]
  )
} as const

export type StorageRole = keyof typeof storageTables

/** @internal */
export const tableDefinition = (
  role: StorageRole,
  name: string,
  subjectType: "text" | "integer" = "text"
): StorageTable => {
  const table = storageTables[role]

  return {
    name,
    columns: Object.fromEntries(
      Object.entries(table.columns).map(([key, column]) => [
        key,
        {
          ...column,
          name: key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()),
          ...(key === "subjectId" ? { type: subjectType } : {})
        }
      ])
    ),
    unique: table.unique,
    indexes: table.indexes
  }
}
