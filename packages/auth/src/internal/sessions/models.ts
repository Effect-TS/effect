import * as Schema from "effect/Schema"

import { SubjectId, TokenDigest } from "../../Schema.ts"
import { AuthenticationAssurance, AuthenticationFactor } from "../operations/context.ts"

export const SessionId = Schema.NonEmptyString.pipe(Schema.brand("effect-auth/SessionId"))
export type SessionId = typeof SessionId.Type

export const SecurityRevision = Schema.NonEmptyString.pipe(
  Schema.brand("effect-auth/SecurityRevision")
)

export type SecurityRevision = typeof SecurityRevision.Type

export const AuthenticationFlowId = Schema.NonEmptyString.pipe(
  Schema.brand("effect-auth/AuthenticationFlowId")
)

export type AuthenticationFlowId = typeof AuthenticationFlowId.Type

export const CredentialRevision = Schema.Struct({
  credentialId: Schema.NonEmptyString,
  revision: SecurityRevision
})

export type CredentialRevision = typeof CredentialRevision.Type

/** Captured by the method's authority before cryptographic credential verification begins. */
export const AuthenticationRevision = Schema.Struct({
  subjectId: SubjectId,
  securityRevision: SecurityRevision,
  credentials: Schema.Array(CredentialRevision).check(Schema.isMaxLength(64))
})

export type AuthenticationRevision = typeof AuthenticationRevision.Type

export const AuthenticationProof = Schema.Struct({
  method: Schema.NonEmptyString,
  /** Distinguishes independently verified credentials without exposing credential material. */
  credentialId: Schema.NonEmptyString,
  factors: Schema.Array(AuthenticationFactor),
  userVerified: Schema.Boolean,
  phishingResistant: Schema.Boolean,
  verifiedAt: Schema.DateTimeUtcFromMillis
})

export type AuthenticationProof = typeof AuthenticationProof.Type

const authenticationSourceFields = {
  revision: AuthenticationRevision,
  flowId: AuthenticationFlowId,
  bindingDigest: TokenDigest,
  proofs: Schema.NonEmptyArray(AuthenticationProof).check(Schema.isMaxLength(64))
}

/** Trusted method evidence. No public endpoint accepts subject/factor assertions as proof. */
export const AuthenticationEvidence = Schema.Struct({
  ...authenticationSourceFields,
  /** Absolute flow-completion deadline, not a session lifetime. */
  completionExpiresAt: Schema.optionalKey(Schema.DateTimeUtcFromMillis)
})

export type AuthenticationEvidence = typeof AuthenticationEvidence.Type

/** Private source evidence; successful issuance consumes the flow-completion deadline. */
export const SessionAuthenticationProvenance = Schema.Struct({
  evidence: Schema.Struct(authenticationSourceFields)
})

export type SessionAuthenticationProvenance = typeof SessionAuthenticationProvenance.Type

/** Identifies the exact issued credential, independently of storage CAS versions. */
export const SessionCredentialVersion = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)
).pipe(Schema.brand("effect-auth/SessionCredentialVersion"))

export type SessionCredentialVersion = typeof SessionCredentialVersion.Type

export const AssuranceAlternative = Schema.Struct({
  factors: Schema.Array(AuthenticationFactor),
  userVerified: Schema.Boolean,
  phishingResistant: Schema.Boolean,
  minimumCredentials: Schema.Int.check(Schema.isGreaterThan(0))
})

export const AuthenticationRequirement = Schema.Struct({
  alternatives: Schema.NonEmptyArray(AssuranceAlternative),
  maximumAgeMillis: Schema.Int.check(Schema.isGreaterThan(0))
})

export type AuthenticationRequirement = typeof AuthenticationRequirement.Type

/** One authority read before verification; issuance rechecks current policy and revisions. */
export const AuthenticationCapture = Schema.Struct({
  revision: AuthenticationRevision,
  requirement: AuthenticationRequirement
})

export type AuthenticationCapture = typeof AuthenticationCapture.Type

export const SessionMetadata = Schema.Struct({
  sessionId: SessionId,
  subjectId: SubjectId,
  securityRevision: SecurityRevision,
  assurance: AuthenticationAssurance,
  issuedAt: Schema.DateTimeUtcFromMillis,
  expiresAt: Schema.DateTimeUtcFromMillis,
  absoluteExpiresAt: Schema.DateTimeUtcFromMillis
})

export type SessionMetadata = typeof SessionMetadata.Type

export interface SessionInspection<Claims> {
  readonly session: SessionMetadata & { readonly claims: Claims }
  readonly provenance: SessionAuthenticationProvenance
  readonly credentialVersion: SessionCredentialVersion
}

/** Private guard from the same authoritative read as the inspection. */
export const SessionGuard = Schema.Union([
  Schema.TaggedStruct("Stateful", { digest: TokenDigest }),
  Schema.TaggedStruct("StateAssistedSigned", {}),
  Schema.TaggedStruct("StatelessSigned", {})
])

export type SessionGuard = typeof SessionGuard.Type

/** Trusted request-local source. Cookie-cache public sessions never create this value. */
export interface SessionSource<Claims> {
  readonly inspection: SessionInspection<Claims>
  readonly guard: SessionGuard
}

/** Mandatory discriminator in the shared pending store; every port predicates it. */
export const PendingAuthenticationKind = Schema.Literals(["Login", "StepUp"])
export type PendingAuthenticationKind = typeof PendingAuthenticationKind.Type

export const PendingConsumption = Schema.Struct({
  flowId: AuthenticationFlowId,
  digest: TokenDigest,
  bindingDigest: TokenDigest,
  version: SecurityRevision
})

export type PendingConsumption = typeof PendingConsumption.Type

export const SessionSignOut = Schema.Struct({
  clearCredential: Schema.Literal(true),
  invalidation: Schema.Literals(["revoked", "already-invalid", "client-only"])
})

export type SessionSignOut = typeof SessionSignOut.Type

export const SessionReadOptions = Schema.Struct({
  /** Bypass the cookie cache and verify against authoritative state. */
  fresh: Schema.optionalKey(Schema.Boolean)
})

export type SessionReadOptions = typeof SessionReadOptions.Type

export const SessionCapabilities = Schema.Struct({
  mode: Schema.Literals(["stateful", "stateless", "state-assisted"]),
  listing: Schema.Boolean,
  perSessionRevocation: Schema.Boolean,
  subjectInvalidation: Schema.Literals(["immediate", "absolute-expiry"]),
  renewal: Schema.Literals(["single-winner", "replayable"]),
  /** Maximum lifetime of an explicitly enabled session cookie snapshot; zero by default. */
  positiveCacheMillis: Schema.Natural
})

export type SessionCapabilities = typeof SessionCapabilities.Type
