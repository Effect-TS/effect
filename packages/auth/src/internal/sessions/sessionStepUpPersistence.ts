import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import type { PrepareSessionCommit } from "./commit.ts"
import type { SessionConflict, SessionStepUpInvalid, SessionUnavailable, StaleAuthentication } from "./errors.ts"
import {
  AssuranceAlternative,
  type AuthenticationEvidence,
  AuthenticationFlowId,
  AuthenticationRequirement,
  AuthenticationRevision,
  SecurityRevision,
  SessionCredentialVersion,
  SessionId,
  type SessionInspection,
  type SessionSource
} from "./models.ts"

export const SessionStepUpProfileId = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9._-]{1,128}$/)
).pipe(Schema.brand("effect-auth/SessionStepUpProfileId"))

export type SessionStepUpProfileId = typeof SessionStepUpProfileId.Type

export const SessionStepUpRequirement = Schema.Struct({
  ...AuthenticationRequirement.fields,
  alternatives: Schema.NonEmptyArray(
    Schema.Struct({
      ...AssuranceAlternative.fields,
      factors: AssuranceAlternative.fields.factors.check(Schema.isMaxLength(3)),
      minimumCredentials: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 }))
    })
  ).check(Schema.isMaxLength(16))
})

export const SessionStepUpProfile = Schema.Struct({
  profileId: SessionStepUpProfileId,
  generation: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })),
  requirement: SessionStepUpRequirement,
  lifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 900000 })),
  attemptLimit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))
})

export type SessionStepUpProfile = typeof SessionStepUpProfile.Type

export const StepUpPending = Schema.TaggedStruct("StepUpPending", {
  profileId: SessionStepUpProfileId,
  expiresAt: Schema.DateTimeUtcFromMillis
})

export type StepUpPending = typeof StepUpPending.Type

export const SessionStepUpIntent = Schema.TaggedStruct("SessionStepUpIntent", {
  digest: TokenDigest,
  version: SecurityRevision,
  flowId: AuthenticationFlowId,
  bindingDigest: TokenDigest,
  revision: AuthenticationRevision,
  sourceKind: Schema.Literals(["Stateful", "StateAssistedSigned", "StatelessSigned"]),
  sourceSessionId: SessionId,
  sourceCredentialVersion: SessionCredentialVersion,
  sourceAuthenticatedAt: Schema.DateTimeUtcFromMillis,
  sourceExpiresAt: Schema.DateTimeUtcFromMillis,
  sourceAbsoluteExpiresAt: Schema.DateTimeUtcFromMillis,
  profileId: SessionStepUpProfileId,
  profileGeneration: SessionStepUpProfile.fields.generation,
  profileDigest: TokenDigest,
  requirement: SessionStepUpProfile.fields.requirement,
  expiresAt: Schema.DateTimeUtcFromMillis,
  attemptLimit: SessionStepUpProfile.fields.attemptLimit
})

export type SessionStepUpIntent = typeof SessionStepUpIntent.Type

/** Detached trusted snapshot from the single authoritative StepUp-kind read. */
export const SessionStepUpSnapshot = Schema.Struct({
  intent: SessionStepUpIntent,
  requirement: AuthenticationRequirement
})

export type SessionStepUpSnapshot = typeof SessionStepUpSnapshot.Type

export type SessionStepUpReplacement<Claims> =
  | {
    readonly _tag: "Stateful"
    readonly inspection: SessionInspection<Claims>
    readonly expectedDigest: TokenDigest
    readonly nextDigest: TokenDigest
  }
  | {
    readonly _tag: "StateAssistedSigned"
    readonly inspection: SessionInspection<Claims>
    readonly tombstoneSessionId: SessionId
    readonly tombstoneUntil: DateTime.Utc
  }
  | { readonly _tag: "StatelessSigned"; readonly inspection: SessionInspection<Claims> }

/** No bearer, callback or crypto work. All fields are preplanned under the core's
 * trusted snapshots. Native owners must preserve the exact replacement metadata. */
export interface SessionStepUpCompletionPlan<Claims> {
  readonly intent: SessionStepUpIntent
  readonly source: SessionSource<Claims>
  readonly evidence: AuthenticationEvidence
  readonly baseRequirement: AuthenticationRequirement
  readonly profileRequirement: AuthenticationRequirement
  /** Shared assessment clock for the prepared assurance, before hooks. */
  readonly now: DateTime.Utc
  readonly replacement: SessionStepUpReplacement<Claims>
}

/** Optional, distinct from login pending. No implementation may compose standalone
 * rotate/revoke/pending commits to approximate the one-owner complete transition. */
export interface SessionStepUpPersistence<Claims> {
  /** Check active exact revisions and all source/time bounds; unique flow/digest.
   * Prepare BEFORE the actual commit. Ambient owners must join or reject before writes. */
  readonly create: <A>(
    input: Omit<SessionStepUpIntent, "version">,
    now: DateTime.Utc,
    prepare: PrepareSessionCommit<SessionStepUpIntent, A>
  ) => Effect.Effect<PreparedCommit<A>, StaleAuthentication | SessionConflict | SessionUnavailable>
  /** Check StepUp kind, source/revisions, expiry, consumption and budget, and return
   * the current base requirement from the same read. Final completion rechecks all. */
  readonly read: (input: {
    readonly digest: TokenDigest
    readonly now: DateTime.Utc
  }) => Effect.Effect<SessionStepUpSnapshot, SessionStepUpInvalid | SessionUnavailable>
  /** Authenticate binding internally, atomically cap/increment attempts, return a
   * decision VALUE. Unknown commits are unavailable, never automatically retried. */
  readonly reject: <A>(
    input: { readonly digest: TokenDigest; readonly now: DateTime.Utc },
    prepare: PrepareSessionCommit<{ readonly _tag: "Rejected" }, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionUnavailable>
  /** Recheck intent version/status/budget, exact source/profile/revisions and BOTH
   * requirements at the actual commit clock. Stateful: guard source digest and
   * credential version, update in place + consume. Stored sourceKind must match
   * both the inspected guard and replacement tag, including after deployment changes.
   * Assisted: insert absent source lineage tombstone + consume. Pure signed:
   * consume only; old source remains live.
   * Preserve source absolute expiry and exact prepared metadata. Replacement
   * authenticatedAt reflects the newly satisfied profile; retained proofs keep
   * their original verifiedAt timestamps and private credential revisions.
   * A guard loss discards prepared bearer/events, including under an outer owner.
   * The callback is synchronous and must run before physical commit, including D1.
   */
  readonly complete: <A>(
    plan: SessionStepUpCompletionPlan<Claims>,
    prepare: PrepareSessionCommit<SessionInspection<Claims>, A>
  ) => Effect.Effect<
    PreparedCommit<A>,
    SessionStepUpInvalid | StaleAuthentication | SessionConflict | SessionUnavailable
  >
}
