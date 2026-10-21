import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import type { SessionInvalidationWindow } from "../sessions/invalidation.ts"
import type { PasskeyUnavailable } from "./errors.ts"
import type {
  PasskeyAccess,
  PasskeyActionAuthorization,
  PasskeyCeremony,
  PasskeyCredential,
  PasskeyCredentialSummary,
  PasskeyRegistrationVerified,
  PasskeyRemoved
} from "./models.ts"
import type { PreparePasskeyCommit } from "./passkeyPersistence.ts"
import type { PasskeyManagementPolicy } from "./policy.ts"

/** Subject-first mutation owners. Credential IDs are RP-global; each credential
 * retains its own user handle. No network calls or session Claims. */
export class PasskeyManagementPersistence extends Context.Service<
  PasskeyManagementPersistence,
  {
    /** Current metadata-access policy and subject ownership. */
    readonly list: (input: {
      readonly moduleId: string
      readonly subjectId: SubjectId
      readonly cursor?: string
      readonly limit: number
    }) => Effect.Effect<
      { readonly credentials: ReadonlyArray<PasskeyCredentialSummary>; readonly cursor?: string },
      PasskeyUnavailable
    >
    /** Re-assess stored begin authorization, revisions and freshness once under
     * the subject lock. Consume the exact challenge at database time and check
     * credential uniqueness and the current credential cap. Join credential,
     * shared factor and event atomically. Preserve subject security revision
     * and existing authentication; enrollment neither issues nor refreshes a session
     * and never creates AuthenticationEvidence. Primary eligibility
     * requires the persisted enrollment profile AND verified UV, never later promotion. */
    readonly completeEnrollment: <A>(
      input: {
        readonly access: PasskeyAccess
        readonly ceremony: PasskeyCeremony
        readonly verified: PasskeyRegistrationVerified
        readonly management: PasskeyManagementPolicy
      },
      prepare: PreparePasskeyCommit<
        | { readonly _tag: "Enrolled"; readonly credential: PasskeyCredentialSummary }
        | { readonly _tag: "Rejected" },
        A
      >
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
    /** Advisory target snapshot for the authenticated owner before action proof. */
    readonly inspectRemove: (input: {
      readonly moduleId: string
      readonly subjectId: SubjectId
      readonly credentialId: string
    }) => Effect.Effect<
      | { readonly _tag: "Target"; readonly credential: PasskeyCredential }
      | { readonly _tag: "Rejected" },
      PasskeyUnavailable
    >
    /** Current independent action authority and last usable primary/recovery/factor
     * policy in SAME owner; factor-only and connected grants are not alternatives.
     * Concurrent removals leave a usable path. Remove credential/shared factor,
     * bump semantic+subject revisions and invalidate under the declared strategy.
     * The revision change makes outstanding authentication stale. */
    readonly remove: <A>(
      input: {
        readonly moduleId: string
        readonly commandId: string
        readonly credential: PasskeyCredential
        readonly authorization: PasskeyActionAuthorization
        readonly management: PasskeyManagementPolicy
        readonly invalidation: SessionInvalidationWindow
      },
      prepare: PreparePasskeyCommit<
        | { readonly _tag: "Removed"; readonly result: typeof PasskeyRemoved.Type }
        | { readonly _tag: "Rejected" | "LastSignInMethod" },
        A
      >
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
    /** Safe metadata only, no semantic revision bump. Current active owner/policy
     * and credential ownership guard the update. */
    readonly rename: <A>(
      input: {
        readonly moduleId: string
        readonly subjectId: SubjectId
        readonly commandId: string
        readonly credentialId: string
        readonly name: string
      },
      prepare: PreparePasskeyCommit<
        | {
          readonly _tag: "Renamed"
          readonly credential: PasskeyCredentialSummary
        }
        | { readonly _tag: "Rejected" },
        A
      >
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
  }
>()("@effect/auth/PasskeyManagementPersistence") {}
