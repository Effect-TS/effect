import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"

import type { SubjectId } from "../../../Schema.ts"
import type { CommitJournal, PreparedCommit } from "../../hooks/commit.ts"
import type { LoginIdentifier } from "../../identity/models.ts"
import type { ProofRedemptionPlan } from "../../proofs/redemption.ts"
import type { SessionInvalidationWindow } from "../../sessions/invalidation.ts"
import type { AuthenticationRevision } from "../../sessions/models.ts"
import type { EncodedPasswordHash } from "../models.ts"
import type { PasswordUnavailable } from "./errors.ts"
import type {
  PasswordActionAuthorization,
  PasswordCommandId,
  PasswordCredentialSnapshot,
  PasswordMutationDecision,
  PasswordReplacement
} from "./models.ts"

export type PreparePasswordCommit<Value, A> = (
  value: Value,
  journal: CommitJournal
) => PreparedCommit<A>

export interface PasswordMutationInput {
  readonly moduleId: string
  readonly commandId: PasswordCommandId
  readonly expectedRevision: AuthenticationRevision
  readonly credential?: PasswordCredentialSnapshot
  readonly replacement: PasswordReplacement
  readonly authorization: PasswordActionAuthorization
  readonly invalidation: SessionInvalidationWindow
}

/** Semantic authority. All mutations prepare before root physical commit and
 * join only an explicitly matching outer authority. Prepared method plans expose
 * a commit Effect that resolves its authority from Effect context at execution.
 * Provide the transaction-bound implementation there. A root service must reject ambient
 * use it cannot join before writes. No generic get/put/upsert.
 */
export class PasswordPersistence extends Context.Service<
  PasswordPersistence,
  {
    /** Read a coherent candidate and the complete active factor revision vector
     * without writing or holding a transaction open.
     * Unknown, disabled, missing, or ineligible identifiers return None.
     * Session issuance and password mutation recheck the captured authority.
     * Identifier removal, rebinding, or eligibility changes MUST bump the subject
     * security revision atomically: identifierBindingRevision is not part of
     * AuthenticationRevision. Native identifiers stay inside the adapter.
     */
    readonly findCredential: (input: {
      readonly moduleId: string
      readonly identifier: LoginIdentifier
      readonly subjectId?: SubjectId
    }) => Effect.Effect<Option.Option<PasswordCredentialSnapshot>, PasswordUnavailable>
    /** Conditional maintenance only when hash parameters change. Compare the exact
     * credential identity, semantic revision, verifier and verifierVersion; change
     * only verifier/version. A lost CAS is a no-op, never unconditional replacement.
     * This write grants no authority and must not advance semantic/security revisions.
     */
    readonly rehashIfCurrent: (input: {
      readonly credential: PasswordCredentialSnapshot
      readonly nextVerifier: Redacted.Redacted<EncodedPasswordHash>
    }) => Effect.Effect<void, PasswordUnavailable>
    /** The password snapshot includes the complete current active factor vector. */
    readonly readForSubject: (input: {
      readonly moduleId: string
      readonly subjectId: SubjectId
    }) => Effect.Effect<Option.Option<PasswordCredentialSnapshot>, PasswordUnavailable>
    /** Only eligible verified identifiers; return None for absent/inactive/ineligible.
     * Capture the complete active factor revision vector with the subject and password
     * snapshot, including independent recovery credentials. Action policy may bind a
     * separately selected recovery factor to this vector; the mutation owner still
     * rechecks current authority before redeeming and changing the password. */
    readonly recoveryTarget: (input: {
      readonly moduleId: string
      readonly identifier: LoginIdentifier
    }) => Effect.Effect<Option.Option<PasswordCredentialSnapshot>, PasswordUnavailable>
    /** Require absence, current revisions/action+factor policy/fresh clock. */
    readonly addIfAbsent: <A>(
      input: PasswordMutationInput,
      prepare: PreparePasswordCommit<PasswordMutationDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, PasswordUnavailable>
    /** Exact credential CAS, current action policy/freshness; bump semantic credential
     * and subject security revisions + pending/session invalidation in SAME authority.
     */
    readonly replaceIfCurrent: <A>(
      input: PasswordMutationInput,
      prepare: PreparePasswordCommit<PasswordMutationDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, PasswordUnavailable>
    /** Compose proof predicates + replacement/invalidation atomically. Never call an
     * independently committing ProofPersistence.redeem. redeemed iff ALL apply.
     * On D1 a lost guard aborts the batch and returns unavailable, as does any
     * unknown SQL failure.
     */
    readonly resetWithProof: <A>(
      input: PasswordMutationInput & { readonly redemption: ProofRedemptionPlan },
      prepare: PreparePasswordCommit<PasswordMutationDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, PasswordUnavailable>
  }
>()("@effect/auth/PasswordPersistence") {}
