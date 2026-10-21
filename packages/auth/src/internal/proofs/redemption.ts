import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { ProofRedemptionDecision, ProofRedemptionInput } from "./models.ts"

/** Private digest-bearing plan, never serialized. The mutation owner locks the
 * subject first, rechecks authority once, then redeems and writes atomically.
 * Report redeemed only if both deletion and protected write apply. A failed write
 * rolls back deletion. D1 compiles equivalent guards; prepare only projects a
 * precomputed decision synchronously, never executes arbitrary batch callbacks.
 * Keep the original flow/binding and proof ID for final coordinated checks. */
export interface ProofRedemptionPlan {
  readonly input: ProofRedemptionInput
  readonly prepare: <A>(
    decision: ProofRedemptionDecision,
    journal: CommitJournal,
    project: (decision: ProofRedemptionDecision) => A
  ) => PreparedCommit<A>
}
