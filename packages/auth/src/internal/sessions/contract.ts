import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import { SessionConfigurationError, SessionError, SessionSignOutUnavailable } from "./errors.ts"
import { SessionInvalidationWindow } from "./invalidation.ts"
import {
  AuthenticationEvidence,
  AuthenticationRequirement,
  SessionCapabilities,
  SessionId,
  SessionMetadata,
  SessionSignOut
} from "./models.ts"
import { SessionStepUpProfileId, StepUpPending } from "./sessionStepUpPersistence.ts"

/** Canonical session contracts without installing session authority or strategy Layers. */
export const makeSessionContract = <
  const Id extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  claims: Claims
) => {
  if (!Schema.is(Schema.NonEmptyString)(moduleId)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Public synchronous session contract construction requires claims.
    throw SessionConfigurationError.make({ reason: "claims" })
  }

  const ClaimsCodec: Schema.Codec<
    Claims["Type"],
    Claims["Encoded"],
    Claims["DecodingServices"],
    Claims["EncodingServices"]
  > = claims

  const Session = Schema.Struct({
    ...SessionMetadata.fields,
    claims: ClaimsCodec,
    /** Server-derived delay from this read. Absent when renewal cannot extend the session. */
    renewAfterMillis: Schema.optionalKey(Schema.Natural)
  })

  const Completed = Schema.TaggedStruct("Authenticated", { session: Session })

  const Pending = Schema.TaggedStruct("PendingAuthentication", {
    expiresAt: Schema.DateTimeUtcFromMillis
  })

  const CompletionResult = Schema.Union([Completed, Pending])

  const SignOutResult = Schema.Union([SessionSignOut, SessionSignOutUnavailable])

  const Failure = Schema.Union([SessionError, HookDenied])
  const Credential = Schema.RedactedFromValue(Schema.NonEmptyString)

  const StepUpBegin = makeOperation(`${moduleId}/session/step-up/begin`, {
    payload: Schema.Struct({ sourceCredential: Credential, profileId: SessionStepUpProfileId }),
    exposure: "public",
    success: StepUpPending,
    error: Failure,
    access: "authenticated",
    replay: "non-idempotent",
    credentials: true
  })

  const StepUpComplete = makeOperation(`${moduleId}/session/step-up/complete`, {
    payload: Schema.Struct({
      sourceCredential: Credential,
      stepUpCredential: Credential,
      additional: AuthenticationEvidence
    }),
    exposure: "internal",
    success: Session,
    error: Failure,
    access: "system",
    replay: "single-use",
    credentials: true
  })

  const StepUpReject = makeOperation(`${moduleId}/session/step-up/reject`, {
    payload: Schema.Struct({ stepUpCredential: Credential }),
    exposure: "internal",
    success: Schema.TaggedStruct("Rejected", {}),
    error: Failure,
    access: "system",
    replay: "non-idempotent"
  })

  const stepUpOperations = Object.freeze({
    Begin: StepUpBegin,
    Complete: StepUpComplete,
    Reject: StepUpReject
  })

  const Complete = makeOperation(`${moduleId}/session/complete`, {
    payload: Schema.Struct({
      evidence: AuthenticationEvidence,
      requirement: AuthenticationRequirement,
      claims: ClaimsCodec
    }),
    success: CompletionResult,
    error: Failure,
    access: "system",
    replay: "non-idempotent",
    credentials: true
  })

  const CompletePending = makeOperation(`${moduleId}/session/complete-pending`, {
    payload: Schema.Struct({ credential: Credential, additional: AuthenticationEvidence }),
    success: CompletionResult,
    error: Failure,
    access: "system",
    replay: "single-use",
    credentials: true
  })

  const RejectPending = makeOperation(`${moduleId}/session/reject-pending`, {
    payload: Schema.Struct({ credential: Credential }),
    success: Schema.TaggedStruct("Rejected", {}),
    error: Failure,
    access: "system",
    replay: "non-idempotent"
  })

  const Capabilities = makeOperation(`${moduleId}/session/capabilities`, {
    payload: Schema.Void,
    success: SessionCapabilities,
    error: Schema.Never,
    access: "any",
    exposure: "public",
    replay: "read-only"
  })

  const Verify = makeOperation(`${moduleId}/session/verify`, {
    payload: Schema.Struct({ credential: Credential }),
    success: Session,
    error: Failure,
    access: "any",
    replay: "read-only"
  })

  const Renew = makeOperation(`${moduleId}/session/renew`, {
    payload: Schema.Struct({ credential: Credential }),
    success: Session,
    error: Failure,
    access: "any",
    replay: "non-idempotent",
    credentials: true
  })

  const SignOut = makeOperation(`${moduleId}/session/sign-out`, {
    payload: Schema.Struct({ credential: Credential }),
    success: SignOutResult,
    error: Failure,
    access: "any",
    replay: "idempotent",
    credentials: true
  })

  const List = makeOperation(`${moduleId}/session/list`, {
    payload: Schema.Struct({
      credential: Credential,
      cursor: Schema.optionalKey(Schema.String),
      limit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))
    }),
    success: Schema.Struct({
      sessions: Schema.Array(SessionMetadata),
      nextCursor: Schema.optionalKey(Schema.String)
    }),
    error: Failure,
    access: "authenticated",
    replay: "read-only"
  })

  const Revoke = makeOperation(`${moduleId}/session/revoke`, {
    payload: Schema.Struct({ credential: Credential, sessionId: SessionId }),
    success: Schema.Void,
    error: Failure,
    access: "authenticated",
    replay: "idempotent"
  })

  const RevokeAll = makeOperation(`${moduleId}/session/revoke-all`, {
    payload: Schema.Struct({ credential: Credential }),
    success: SessionInvalidationWindow,
    error: Failure,
    access: "authenticated",
    replay: "non-idempotent"
  })

  const operations = Object.freeze({
    Complete,
    CompletePending,
    RejectPending,
    Capabilities,
    Verify,
    Renew,
    SignOut,
    List,
    Revoke,
    RevokeAll
  })

  return Object.freeze({
    moduleId,
    Session,
    CompletionResult,
    operations,
    group: operationGroup(...Object.values(operations)),
    stepUpOperations,
    stepUpGroup: operationGroup(...Object.values(stepUpOperations))
  })
}
