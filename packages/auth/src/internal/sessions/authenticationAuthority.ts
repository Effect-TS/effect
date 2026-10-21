import * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import type { PrepareSessionCommit } from "./commit.ts"
import type { PendingAuthenticationInvalid, SessionUnavailable, StaleAuthentication } from "./errors.ts"
import type {
  AuthenticationCapture,
  AuthenticationEvidence,
  AuthenticationRequirement,
  PendingConsumption
} from "./models.ts"

/** Subject status, factor policy, and revision are owned by the consumer's identity authority. */
export class AuthenticationAuthority extends Context.Service<
  AuthenticationAuthority,
  {
    /** Read the active subject, current factor policy and complete active factor
     * revision vector together. Every supplied credential ID is a required anchor,
     * not a projection; an empty list still returns the full vector. This records
     * authority, not proof of those factors. The requirement is planning data;
     * approve/establish must recheck current policy under the committing authority. */
    readonly capture: (
      subjectId: SubjectId,
      credentialIds: ReadonlyArray<string>
    ) => Effect.Effect<AuthenticationCapture, StaleAuthentication | SessionUnavailable>
    /** Reject unless the captured revision is still current; never refresh old evidence's revision. */
    readonly requirements: (
      evidence: AuthenticationEvidence
    ) => Effect.Effect<AuthenticationRequirement, StaleAuthentication | SessionUnavailable>
    /**
     * Linearization point for fresh signed-session authentication. Check active
     * subject, current factor policy/freshness, unexpired issuance, and exactly these revisions, consuming pending state in the same
     * commit when provided. Re-read the clock at the conditional commit, never rely
     * solely on the caller's pre-hook timestamp. Stateless verification and renewal never call this.
     */
    readonly approve: <A>(
      input: {
        readonly evidence: AuthenticationEvidence
        readonly now: DateTime.Utc
        /** Preserve this prepared instant; bound its future lead with AuthenticationClock. */
        readonly issuedAt: DateTime.Utc
        readonly expiresAt: DateTime.Utc
        readonly absoluteExpiresAt: DateTime.Utc
        readonly pending?: PendingConsumption
      },
      prepare: PrepareSessionCommit<void, A>
    ) => Effect.Effect<
      PreparedCommit<A>,
      StaleAuthentication | PendingAuthenticationInvalid | SessionUnavailable
    >
  }
>()("@effect/auth/AuthenticationAuthority") {}
