import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { LoginIdentifier } from "../identity/models.ts"
import type { ProofRedemptionPlan } from "../proofs/redemption.ts"
import type { SessionInvalidationWindow } from "../sessions/invalidation.ts"
import type { AuthenticationRevision, SecurityRevision } from "../sessions/models.ts"
import type { EmailActionAuthorization } from "./emailActionEvidence.ts"
import type { EmailUnavailable } from "./errors.ts"
import type { EmailAddressDecision, EmailCommandId, EmailCredentialSnapshot } from "./models.ts"

export type PrepareEmailCommit<V, A> = (value: V, journal: CommitJournal) => PreparedCommit<A>

export interface EmailAddressTarget {
  readonly revision: AuthenticationRevision
  readonly source?: EmailCredentialSnapshot
  /** Set only for an existing, same-subject unverified identifier. */
  readonly targetIdentifierRevision?: SecurityRevision
  /** Target absent or same-subject unverified. Conflicts remain privately suppressed. */
  readonly eligible: boolean
}

export interface EmailAddressMutation {
  readonly moduleId: string
  readonly commandId: EmailCommandId
  readonly target: LoginIdentifier
  readonly captured: EmailAddressTarget
  readonly authorization: EmailActionAuthorization
  readonly redemption: ProofRedemptionPlan
  /** Absent only when confirming an existing identifier without replacing authentication. */
  readonly invalidation?: SessionInvalidationWindow
}

/** Same-authority identity mutations, never generic CRUD. Preparation/crypto/hooks
 * run before locks; plan.commit resolves the actual transaction-bound implementation
 * from Effect context when it executes.
 * Root implementations reject ambient ownership they cannot join before writes.
 * Verify/change consume the exact proof, enforce current subject/source and
 * factor-policy/fresh-clock predicates, global target uniqueness, write verified
 * identifier + email credential, and bump binding/credential revisions in ONE physical
 * transaction/batch. Confirming an existing bound identifier preserves the subject's
 * security revision and sessions. Adding/replacing an identifier also bumps security
 * revision and invalidates pending/sessions. A zero-row protected
 * write cannot burn the proof. D1 preplans receipts before its guarded batch; exact
 * guard loss discards that journal before a separate rejected owner. Unknown outcome
 * is unavailable. Generic IdentityMutation remains unmounted without this same join.
 */
export class EmailAddressPersistence extends Context.Service<
  EmailAddressPersistence,
  {
    readonly target: (input: {
      readonly moduleId: string
      readonly subjectId: SubjectId
      readonly target: LoginIdentifier
      readonly sourceCredentialId?: string
    }) => Effect.Effect<EmailAddressTarget, EmailUnavailable>
    readonly verifyWithProof: <A>(
      input: EmailAddressMutation,
      prepare: PrepareEmailCommit<EmailAddressDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, EmailUnavailable>
    readonly changeWithProof: <A>(
      input: EmailAddressMutation,
      prepare: PrepareEmailCommit<EmailAddressDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, EmailUnavailable>
  }
>()("@effect/auth/EmailAddressPersistence") {}
