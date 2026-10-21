import { PersistenceMappingError } from "@effect/auth-persistence"
import type { SubjectIdCodec } from "@effect/auth-persistence/Adapter"
import * as Mapping from "@effect/auth-persistence/OAuthPersistence"
import { eq, sql } from "@effect/auth-persistence/OAuthPersistence"
import * as OAuth from "@effect/auth/OAuth"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

export interface StorageOptions {
  readonly moduleId: string
  readonly provider: string
  readonly issuer: string
  readonly externalSubject: string
  readonly subjectId: string
  /** Seed only a new subject; restarting must not restore a removed login. */
  readonly provisionOnce?: boolean
  /** Override only with a clock using the same integer-millisecond representation. */
  readonly clock?: Mapping.OAuthClock
}

export const subjects = Mapping.table({
  name: "oauth_subject",
  columns: {
    id: { name: "id", type: "text" },
    status: { name: "status", type: "text" },
    securityRevision: { name: "securityRevision", type: "text" }
  },
  unique: [["id"]]
})

export const credentials = Mapping.table({
  name: "oauth_authority_credential",
  columns: {
    subjectId: { name: "subjectId", type: "text" },
    credentialId: { name: "credentialId", type: "text" },
    revision: { name: "revision", type: "text" },
    status: { name: "status", type: "text" }
  },
  unique: [["subjectId", "credentialId"]]
})

export const identities = Mapping.table({
  name: "oauth_identity",
  columns: {
    identityKey: { name: "identityKey", type: "text" },
    provider: { name: "provider", type: "text" },
    issuer: { name: "issuer", type: "text" },
    externalSubject: { name: "externalSubject", type: "text" },
    subjectId: { name: "subjectId", type: "text" }
  },
  unique: [["identityKey"]]
})

export const logins = Mapping.table({
  name: "oauth_login",
  columns: {
    moduleId: { name: "moduleId", type: "text" },
    credentialId: { name: "credentialId", type: "text" },
    subjectId: { name: "subjectId", type: "text" },
    identityKey: { name: "identityKey", type: "text" },
    credentialRevision: { name: "credentialRevision", type: "text" },
    status: { name: "status", type: "text" }
  },
  unique: [["credentialId"], ["identityKey"]]
})

export const signInFlows = Mapping.table({
  name: "oauth_sign_in_flow",
  columns: {
    moduleId: { name: "moduleId", type: "text" },
    flowId: { name: "flowId", type: "text" },
    purpose: { name: "purpose", type: "text" },
    generation: { name: "generation", type: "integer", nullable: true },
    provider: { name: "provider", type: "text", nullable: true },
    callbackId: { name: "callbackId", type: "text", nullable: true },
    issuer: { name: "issuer", type: "text", nullable: true },
    responseIssuerMode: { name: "responseIssuerMode", type: "text", nullable: true },
    subjectId: { name: "subjectId", type: "text", nullable: true },
    stateDigest: { name: "stateDigest", type: "text", nullable: true },
    binderVerifier: { name: "binderVerifier", type: "text", nullable: true },
    binderExpiresAt: { name: "binderExpiresAt", type: "integer", nullable: true },
    snapshot: { name: "snapshot", type: "text", nullable: true },
    issuedAt: { name: "issuedAt", type: "integer", nullable: true },
    expiresAt: { name: "expiresAt", type: "integer", nullable: true }
  },
  unique: [["moduleId", "flowId"], ["stateDigest"]]
})

export const connectedFlows = Mapping.table({
  name: "oauth_connected_flow",
  columns: {
    moduleId: { name: "moduleId", type: "text" },
    flowId: { name: "flowId", type: "text" },
    purpose: { name: "purpose", type: "text" },
    generation: { name: "generation", type: "integer", nullable: true },
    provider: { name: "provider", type: "text", nullable: true },
    callbackId: { name: "callbackId", type: "text", nullable: true },
    issuer: { name: "issuer", type: "text", nullable: true },
    responseIssuerMode: { name: "responseIssuerMode", type: "text", nullable: true },
    subjectId: { name: "subjectId", type: "text", nullable: true },
    stateDigest: { name: "stateDigest", type: "text", nullable: true },
    binderVerifier: { name: "binderVerifier", type: "text", nullable: true },
    binderExpiresAt: { name: "binderExpiresAt", type: "integer", nullable: true },
    snapshot: { name: "snapshot", type: "text", nullable: true },
    issuedAt: { name: "issuedAt", type: "integer", nullable: true },
    expiresAt: { name: "expiresAt", type: "integer", nullable: true }
  },
  unique: [["moduleId", "flowId"], ["stateDigest"]]
})

export const grants = Mapping.table({
  name: "oauth_connected_grant",
  columns: {
    moduleId: { name: "moduleId", type: "text" },
    grantId: { name: "grantId", type: "text" },
    subjectId: { name: "subjectId", type: "text" },
    identityKey: { name: "identityKey", type: "text", nullable: true },
    profileKey: { name: "profileKey", type: "text", nullable: true },
    grantVersion: { name: "grantVersion", type: "text", nullable: true },
    tokenVersion: { name: "tokenVersion", type: "text", nullable: true },
    state: { name: "state", type: "text", nullable: true },
    snapshot: { name: "snapshot", type: "text", nullable: true },
    summary: { name: "summary", type: "text", nullable: true },
    refreshClaimId: { name: "refreshClaimId", type: "text", nullable: true },
    refreshNextTokenVersion: { name: "refreshNextTokenVersion", type: "text", nullable: true },
    refreshClaimedAt: { name: "refreshClaimedAt", type: "integer", nullable: true },
    refreshClaimExpiresAt: { name: "refreshClaimExpiresAt", type: "integer", nullable: true },
    expiresAt: { name: "expiresAt", type: "integer", nullable: true }
  },
  unique: [
    ["moduleId", "grantId"],
    ["moduleId", "subjectId", "profileKey", "identityKey"]
  ]
})

export const revocations = Mapping.table({
  name: "oauth_connected_revocation",
  columns: {
    jobId: { name: "jobId", type: "text" },
    moduleId: { name: "moduleId", type: "text" },
    subjectId: { name: "subjectId", type: "text" },
    identityKey: { name: "identityKey", type: "text", nullable: true },
    snapshot: { name: "snapshot", type: "text", nullable: true },
    state: { name: "state", type: "text", nullable: true },
    claimId: { name: "claimId", type: "text", nullable: true },
    claimedAt: { name: "claimedAt", type: "integer", nullable: true },
    claimExpiresAt: { name: "claimExpiresAt", type: "integer", nullable: true },
    retentionUntil: { name: "retentionUntil", type: "integer", nullable: true }
  },
  unique: [["jobId"]]
})

export const requirement = Sessions.AuthenticationRequirement.make({
  maximumAgeMillis: 300_000,
  alternatives: [
    {
      factors: ["possession"],
      minimumCredentials: 1,
      userVerified: false,
      phishingResistant: false
    }
  ]
})

const policyRevision = Sessions.SecurityRevision.make("owner-v1")

export const subjectId: SubjectIdCodec<string> = {
  toNative: (id) => Effect.succeed(id),
  toSubject: (id) =>
    Schema.decodeEffect(SubjectId)(id).pipe(
      Effect.mapError(() =>
        PersistenceMappingError.make({
          operation: "oauth-storage.subject",
          cause: undefined
        })
      )
    ),
  equals: (left, right) => left === right
}

export const subject = {
  table: subjects,
  id: "id",
  status: "status",
  securityRevision: "securityRevision",
  isActiveStatus: (value: unknown) => value === "active",
  activeCondition: eq(subjects.columns.status, "active"),
  decodeAuthenticationRequirement: () => requirement
} satisfies Mapping.OAuthSubjectReadTable<typeof subjects>

export const authority = {
  table: credentials,
  subjectId: "subjectId",
  credentialId: "credentialId",
  revision: "revision",
  status: "status",
  isActiveStatus: (value: unknown) => value === "active",
  activeCondition: eq(credentials.columns.status, "active")
} satisfies Mapping.OAuthAuthorityReadTable<typeof credentials>

export const credential = {
  table: logins,
  moduleId: "moduleId",
  credentialId: "credentialId",
  subjectId: "subjectId",
  identityKey: "identityKey",
  credentialRevision: "credentialRevision",
  status: "status",
  isActiveStatus: (value: unknown) => value === "active",
  activeCondition: eq(logins.columns.status, "active")
} satisfies Mapping.OAuthCredentialReadTable<typeof logins>

export const signInFlow = {
  table: signInFlows,
  moduleId: "moduleId",
  flowId: "flowId",
  purpose: "purpose",
  generation: "generation",
  provider: "provider",
  callbackId: "callbackId",
  issuer: "issuer",
  responseIssuerMode: "responseIssuerMode",
  subjectId: "subjectId",
  stateDigest: "stateDigest",
  binderVerifier: "binderVerifier",
  binderExpiresAt: "binderExpiresAt",
  snapshot: "snapshot",
  issuedAt: "issuedAt",
  expiresAt: "expiresAt",
  encodeInsert: (input) => input
} satisfies Mapping.OAuthFlowTable<typeof signInFlows>

export const ownership = {
  table: identities,
  identityKey: "identityKey",
  provider: "provider",
  issuer: "issuer",
  externalSubject: "externalSubject",
  subjectId: "subjectId",
  decodeSubjectId: (row) => Schema.decodeUnknownSync(Schema.String)(row.subjectId),
  // This fixture grants access only to identities provisioned at startup.
  encodeInsert: () => {
    throw PersistenceMappingError.make({
      operation: "oauth-storage.unprovisioned-identity",
      cause: undefined
    })
  }
} satisfies Mapping.OAuthOwnershipTable<typeof identities, string>

const connectedFlow = {
  table: connectedFlows,
  moduleId: "moduleId",
  flowId: "flowId",
  purpose: "purpose",
  generation: "generation",
  provider: "provider",
  callbackId: "callbackId",
  issuer: "issuer",
  responseIssuerMode: "responseIssuerMode",
  subjectId: "subjectId",
  stateDigest: "stateDigest",
  binderVerifier: "binderVerifier",
  binderExpiresAt: "binderExpiresAt",
  snapshot: "snapshot",
  issuedAt: "issuedAt",
  expiresAt: "expiresAt",
  encodeInsert: (input) => input
} satisfies Mapping.OAuthFlowTable<typeof connectedFlows>

const grant = {
  table: grants,
  moduleId: "moduleId",
  grantId: "grantId",
  subjectId: "subjectId",
  identityKey: "identityKey",
  profileKey: "profileKey",
  grantVersion: "grantVersion",
  tokenVersion: "tokenVersion",
  state: "state",
  snapshot: "snapshot",
  summary: "summary",
  refreshClaimId: "refreshClaimId",
  refreshNextTokenVersion: "refreshNextTokenVersion",
  refreshClaimedAt: "refreshClaimedAt",
  refreshClaimExpiresAt: "refreshClaimExpiresAt",
  expiresAt: "expiresAt",
  encodeInsert: ({ grant, subjectId }) => ({
    moduleId: grant.context.moduleId,
    grantId: grant.context.grantId,
    subjectId
  })
} satisfies Mapping.OAuthConnectedGrantTable<typeof grants, string>

const job = {
  table: revocations,
  jobId: "jobId",
  moduleId: "moduleId",
  subjectId: "subjectId",
  identityKey: "identityKey",
  snapshot: "snapshot",
  state: "state",
  claimId: "claimId",
  claimedAt: "claimedAt",
  claimExpiresAt: "claimExpiresAt",
  retentionUntil: "retentionUntil",
  encodeInsert: ({ job, subjectId }) => ({
    jobId: job.jobId,
    moduleId: job.grant.context.moduleId,
    subjectId
  })
} satisfies Mapping.OAuthConnectedRevocationJobTable<typeof revocations, string>

// Each test owns fresh tables for the real OAuth persistence adapter.
const migrations = [
  `CREATE TABLE IF NOT EXISTS oauth_subject (
    "id" TEXT PRIMARY KEY NOT NULL, "status" TEXT NOT NULL, "securityRevision" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS oauth_authority_credential (
    "subjectId" TEXT NOT NULL, "credentialId" TEXT NOT NULL, "revision" TEXT NOT NULL, "status" TEXT NOT NULL,
    UNIQUE("subjectId", "credentialId"))`,
  `CREATE TABLE IF NOT EXISTS oauth_identity (
    "identityKey" TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, issuer TEXT NOT NULL,
    "externalSubject" TEXT NOT NULL, "subjectId" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS oauth_login (
    "moduleId" TEXT NOT NULL, "credentialId" TEXT PRIMARY KEY NOT NULL, "subjectId" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL UNIQUE, "credentialRevision" TEXT NOT NULL, status TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS oauth_login_owner ON oauth_login("identityKey", "subjectId")`,
  `CREATE TABLE IF NOT EXISTS oauth_sign_in_flow (
    "moduleId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "generation" INTEGER,
    "provider" TEXT,
    "callbackId" TEXT,
    "issuer" TEXT,
    "responseIssuerMode" TEXT,
    "subjectId" TEXT,
    "stateDigest" TEXT,
    "binderVerifier" TEXT,
    "binderExpiresAt" INTEGER,
    "snapshot" TEXT,
    "issuedAt" INTEGER,
    "expiresAt" INTEGER,
    UNIQUE("moduleId", "flowId"),
    UNIQUE("stateDigest"))`,
  `CREATE TABLE IF NOT EXISTS oauth_connected_flow (
    "moduleId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "generation" INTEGER,
    "provider" TEXT,
    "callbackId" TEXT,
    "issuer" TEXT,
    "responseIssuerMode" TEXT,
    "subjectId" TEXT,
    "stateDigest" TEXT,
    "binderVerifier" TEXT,
    "binderExpiresAt" INTEGER,
    "snapshot" TEXT,
    "issuedAt" INTEGER,
    "expiresAt" INTEGER,
    UNIQUE("moduleId", "flowId"),
    UNIQUE("stateDigest"))`,
  `CREATE TABLE IF NOT EXISTS oauth_connected_grant (
    "moduleId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identityKey" TEXT,
    "profileKey" TEXT,
    "grantVersion" TEXT,
    "tokenVersion" TEXT,
    "state" TEXT,
    "snapshot" TEXT,
    "summary" TEXT,
    "refreshClaimId" TEXT,
    "refreshNextTokenVersion" TEXT,
    "refreshClaimedAt" INTEGER,
    "refreshClaimExpiresAt" INTEGER,
    "expiresAt" INTEGER,
    UNIQUE("moduleId", "grantId"),
    UNIQUE("moduleId", "subjectId", "profileKey", "identityKey"))`,
  `CREATE TABLE IF NOT EXISTS oauth_connected_revocation (
    "jobId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identityKey" TEXT,
    "snapshot" TEXT,
    "state" TEXT,
    "claimId" TEXT,
    "claimedAt" INTEGER,
    "claimExpiresAt" INTEGER,
    "retentionUntil" INTEGER,
    UNIQUE("jobId"))`,
  `CREATE INDEX IF NOT EXISTS oauth_connected_grant_identity ON oauth_connected_grant("identityKey", "subjectId")`,
  `CREATE INDEX IF NOT EXISTS oauth_connected_revocation_identity ON oauth_connected_revocation("identityKey", "subjectId")`
]

// Canonical adapter identity key: SHA-256 of versioned, length-prefixed UTF-8
// fields. Keep this at the app provisioning boundary until the adapter exports it.
export const identityKey = Effect.fn("OAuthStorage.identityKey")(function*(
  identity: typeof OAuth.OAuthExternalIdentity.Type
) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder("utf-8", { fatal: true })

  const fields = [
    "effect-auth/oauth-identity-key/v1",
    identity.provider,
    identity.issuer,
    identity.subject
  ]

  const bytes = fields.map((value) => encoder.encode(value))

  if (bytes.some((value, i) => decoder.decode(value) !== fields[i])) {
    return yield* PersistenceMappingError.make({
      operation: "oauth-storage.identity",
      cause: undefined
    })
  }
  const packed = new Uint8Array(bytes.reduce((size, value) => size + 4 + value.length, 0))
  const view = new DataView(packed.buffer)
  let offset = 0

  for (const value of bytes) {
    view.setUint32(offset, value.length, false)
    packed.set(value, offset + 4)
    offset += 4 + value.length
  }

  const digest = yield* (yield* Digest.Digest).digest(Digest.sha256, packed)

  return "v1:" + Base64Url.encode(digest)
})

/** App-owned allowlist and explicit Effect SQL storage for OAuth sign-in and grants.
 * Sessions stay stateless. The single federated factor satisfies completion, so
 * pending authentication is not installed. Existing authority rows are never
 * reactivated or reassigned. Supply LifecycleHooks (empty is suitable here).
 */
export const makeMappings = Effect.fnUntraced(function*(options: StorageOptions) {
  const moduleId = yield* Schema.decodeEffect(OAuth.OAuthModuleId)(options.moduleId)
  const localSubject = yield* Schema.decodeEffect(SubjectId)(options.subjectId)

  const identity = yield* Schema.decodeEffect(OAuth.OAuthExternalIdentity)({
    provider: options.provider,
    issuer: options.issuer,
    subject: options.externalSubject
  })

  const key = yield* identityKey(identity)
  const credentialId = `oauth:${key}`
  const sqlClient = yield* SqlClient.SqlClient
  const postgres = sqlClient.onDialectOrElse({ pg: () => true, orElse: () => false })

  yield* sqlClient.withTransaction(
    Effect.gen(function*() {
      for (const statement of migrations) {
        yield* sqlClient.unsafe(postgres ? statement.replaceAll("INTEGER", "BIGINT") : statement)
      }

      const created = yield* sqlClient`INSERT INTO oauth_subject (id, status, "securityRevision")
            VALUES (${localSubject}, 'active', 'initial') ON CONFLICT DO NOTHING RETURNING id`

      if (options.provisionOnce && created.length === 0) return
      yield* sqlClient`INSERT INTO oauth_identity
            ("identityKey", provider, issuer, "externalSubject", "subjectId")
            VALUES (${key}, ${identity.provider}, ${identity.issuer}, ${identity.subject},
              ${localSubject}) ON CONFLICT DO NOTHING`
      yield* sqlClient`INSERT INTO oauth_login
            ("moduleId", "credentialId", "subjectId", "identityKey", "credentialRevision", status)
            VALUES (${moduleId}, ${credentialId}, ${localSubject}, ${key}, 'initial', 'active')
            ON CONFLICT DO NOTHING`
      yield* sqlClient`INSERT INTO oauth_authority_credential
            ("subjectId", "credentialId", revision, status)
            VALUES (${localSubject}, ${credentialId}, 'initial', 'active') ON CONFLICT DO NOTHING`

      const [owner] = yield* sqlClient`SELECT * FROM oauth_identity WHERE "identityKey" = ${key}`
      const [login] = yield* sqlClient`SELECT * FROM oauth_login WHERE "identityKey" = ${key}`

      const [factor] = yield* sqlClient`SELECT * FROM oauth_authority_credential
            WHERE "subjectId" = ${localSubject} AND "credentialId" = ${credentialId}`

      if (
        owner === undefined ||
        owner.subjectId !== localSubject ||
        owner.provider !== identity.provider ||
        owner.issuer !== identity.issuer ||
        owner.externalSubject !== identity.subject ||
        login === undefined ||
        login.moduleId !== moduleId ||
        login.subjectId !== localSubject ||
        login.credentialId !== credentialId ||
        factor === undefined ||
        factor.revision !== login.credentialRevision
      ) {
        return yield* PersistenceMappingError.make({
          operation: "oauth-storage.provision-conflict",
          cause: undefined
        })
      }
    })
  )

  const common = { subject, authority, subjectId, clock: options.clock ?? Mapping.clock }

  const signIn = {
    ...common,
    ownership,
    credential,
    flow: signInFlow,
    constraints: Mapping.requiredOAuthSignInConstraints
  } satisfies Mapping.OAuthSignInMapping<
    typeof subjects,
    typeof identities,
    typeof logins,
    typeof credentials,
    typeof signInFlows,
    string
  >

  const connected = {
    ...common,
    ownership,
    flow: connectedFlow,
    grant,
    credential,
    constraints: Mapping.requiredOAuthConnectedConstraints,
    revocation: {
      mode: "provider",
      job,
      retentionMillis: 86_400_000,
      constraints: Mapping.requiredOAuthConnectedRevocationConstraints
    },
    policy: {
      condition: (input) => {
        const configuration = input.grant?.configuration

        const requestedModule = input.kind === "sign-in"
          ? input.credential.moduleId
          : input.kind === "action"
          ? input.authorization.challenge.moduleId
          : input.authorization.moduleId

        if (
          input.subjectId !== localSubject ||
          requestedModule !== moduleId ||
          ((input.kind === "metadata" || input.kind === "use") &&
            input.authorization.policyRevision !== policyRevision) ||
          (configuration !== undefined &&
            (configuration.provider !== identity.provider ||
              configuration.issuer !== identity.issuer)) ||
          (input.grant !== undefined &&
            (input.grant.identity.provider !== identity.provider ||
              input.grant.identity.issuer !== identity.issuer ||
              input.grant.identity.subject !== identity.subject))
        ) {
          return sql`false`
        }

        return sql`exists(select 1 from ${identities} where ${identities.columns.identityKey} = ${key} and ${identities.columns.subjectId} = ${localSubject})`
      }
    },
    otherReferences: ({ identityKey, subjectId }) =>
      sql`exists(select 1 from ${logins} where ${eq(logins.columns.identityKey, identityKey)} and ${
        eq(logins.columns.subjectId, subjectId)
      })`
  } satisfies Mapping.OAuthConnectedMapping<
    typeof subjects,
    typeof credentials,
    typeof identities,
    typeof connectedFlows,
    typeof grants,
    string,
    typeof revocations
  >

  return { signIn, connected, moduleId, localSubject, credentialId }
})

export const makeServices = Effect.fnUntraced(function*(mappings: Effect.Success<ReturnType<typeof makeMappings>>) {
  const { signIn, connected, moduleId, localSubject, credentialId } = mappings
  const signInServices = yield* Mapping.makeOAuthSignInServices(signIn)
  const connectedServices = yield* Mapping.makeOAuthConnectedServices(connected)

  const revocationServices = yield* Mapping.makeOAuthConnectedRevocationServices({
    ...connected,
    job,
    constraints: Mapping.requiredOAuthConnectedRevocationConstraints
  })

  const sessionServices = yield* Mapping.makeAuthenticationAuthorityServices({
    moduleId,
    clock: signIn.clock,
    subjectId,
    subject: {
      ...subject,
      activeStatusValue: "active",
      requirementColumns: [],
      decodeRequirement: () => Effect.succeed(requirement)
    },
    credential: { ...authority, activeStatusValue: "active" },
    isConstraintConflict: () => false
  })

  const useAuthority = OAuth.OAuthConnectedUseAuthority.of({
    authorize: Effect.fn("OAuthStorage.authorizeUse")(function*(input) {
      if (
        input.invocation._tag !== "Authenticated" ||
        input.invocation.subjectId !== localSubject ||
        input.moduleId !== moduleId
      ) {
        return yield* OAuth.OAuthRejected.make({})
      }

      const current = input.purpose === "use"
        ? input.captured
        : yield* connectedServices.oauthConnectedPersistence.read({
          moduleId,
          subjectId: localSubject
        })

      if (
        current === undefined ||
        !current.revision.credentials.some(
          (credential) => credential.credentialId === credentialId
        )
      ) {
        return yield* OAuth.OAuthRejected.make({})
      }
      const revision = current.revision

      return {
        moduleId,
        revision,
        policyRevision,
        expiresAtMillis: DateTime.toEpochMillis(yield* DateTime.now) + 30_000,
        purpose: input.purpose,
        ...(input.grantId === undefined ? {} : { grantId: input.grantId }),
        ...(input.profileKey === undefined ? {} : { profileKey: input.profileKey })
      }
    })
  })

  return Context.make(OAuth.OAuthSignInPersistence, signInServices.oauthSignInPersistence).pipe(
    Context.add(OAuth.OAuthConnectedPersistence, connectedServices.oauthConnectedPersistence),
    Context.add(OAuth.OAuthConnectedRevocations, revocationServices.oauthConnectedRevocations),
    Context.add(Sessions.AuthenticationAuthority, sessionServices.authenticationAuthority),
    Context.add(OAuth.OAuthConnectedUseAuthority, useAuthority),
    // Connection management requires an application verifier for the exact
    // action challenge. Session assurance alone cannot authorize disconnect.
    Context.add(OAuth.OAuthConnectedActionEvidence, {
      verify: () => Effect.fail(OAuth.OAuthConnectedActionRequired.make({}))
    })
  )
})

export const makeStorage = (options: StorageOptions) =>
  Layer.effectContext(makeMappings(options).pipe(Effect.flatMap(makeServices)))
