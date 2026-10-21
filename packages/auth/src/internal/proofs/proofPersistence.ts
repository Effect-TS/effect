import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { CleanupLimit, CleanupResult } from "../persistence/cleanup.ts"
import type { ProofUnavailable } from "./errors.ts"
import type {
  ProofBinding,
  ProofIssueDecision,
  ProofIssueRecord,
  ProofPurpose,
  ProofRedemptionDecision,
  ProofRedemptionInput
} from "./models.ts"

export type PrepareProofCommit<Value, A> = (
  value: Value,
  journal: CommitJournal
) => PreparedCommit<A>

/** One current code per canonical identifier/subject series. Every mutation owns
 * or joins the real transaction/batch and prepares its receipt before commit.
 * Use the database clock for expiry/cooldown, and exact canonical binding bytes.
 * Core admission charges every schema-valid request before these commands; no SQL budget graph.
 */
export class ProofPersistence extends Context.Service<
  ProofPersistence,
  {
    /** Upsert only when eligible and cooldown permits. A live predecessor must have
     * the same complete binding. Reset this code's failures and reserve its one
     * local dispatch. Return DB issue/expiry times; suppression persists no receipt. */
    readonly issue: <A>(
      input: {
        readonly record: ProofIssueRecord
        readonly lifetimeMillis: number
        readonly resendCooldownMillis: number
        readonly eligible: boolean
      },
      prepare: PrepareProofCommit<ProofIssueDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, ProofUnavailable>
    /** Exact current proof/binding/key/digest + expiry + failure-limit DELETE is the
     * success linearization point. A miss charges only that current code, capped at
     * its limit. Subject-bound standalone redemption locks the subject first;
     * it does not reread factor/identifier authority or refresh captured evidence.
     * Protected writes consume in the SAME owner after subject locks;
     * their failure rolls back redemption. Standalone redemption burns on later
     * session failure. Neither decision is itself authentication evidence. */
    readonly redeem: <A>(
      input: ProofRedemptionInput,
      prepare: PrepareProofCommit<ProofRedemptionDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, ProofUnavailable>
    readonly cancel: <A>(
      input: {
        readonly moduleId: string
        readonly purpose: ProofPurpose
        readonly binding: ProofBinding
      },
      prepare: PrepareProofCommit<void, A>
    ) => Effect.Effect<PreparedCommit<A>, ProofUnavailable>
    /** Delete expired proofs in bounded expiry/key order. No cooldown tombstone
     * remains after redemption/cancel; core admission bounds subsequent issuance. */
    readonly cleanup: <A>(
      input: { readonly moduleId: string; readonly limit: CleanupLimit },
      prepare: PrepareProofCommit<CleanupResult, A>
    ) => Effect.Effect<PreparedCommit<A>, ProofUnavailable>
  }
>()("@effect/auth/ProofPersistence") {}
