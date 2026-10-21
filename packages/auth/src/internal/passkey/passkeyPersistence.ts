import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { CleanupLimit, CleanupResult } from "../persistence/cleanup.ts"
import type { PasskeyUnavailable } from "./errors.ts"
import type {
  PasskeyAccess,
  PasskeyAssertionVerified,
  PasskeyCeremony,
  PasskeyConsumeDecision,
  PasskeyCredential,
  PasskeyIssueDecision
} from "./models.ts"

export type PreparePasskeyCommit<Value, A> = (
  value: Value,
  journal: CommitJournal
) => PreparedCommit<A>

/** Same-owner authority. Synchronous prepare precedes physical commit. Unknown
 * outcomes discard receipts and events and never authorize session issuance. */
export class PasskeyPersistence extends Context.Service<
  PasskeyPersistence,
  {
    /** Insert a unique module/flow challenge with its immutable selected profile,
     * context and binder. Duplicate flows reject without returning a new binder. */
    readonly issue: <A>(
      input: { readonly ceremony: PasskeyCeremony },
      prepare: PreparePasskeyCommit<PasskeyIssueDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
    readonly context: (
      input: PasskeyAccess
    ) => Effect.Effect<PasskeyCeremony | undefined, PasskeyUnavailable>
    /** After protocol verification, conditionally consume the exact challenge,
     * purpose and binder at database time and update its credential counter in one
     * owner. Single-device counters accept zero/zero or a strict increase against
     * the current value. Multi-device counters merge max(current, assertion).
     * A counter CAS miss rejects without a session; native owners may burn the
     * challenge. D1 must assert its conditional writes inside the atomic batch.
     * The session owner rechecks subject and semantic credential authority. */
    readonly consume: <A>(
      input: {
        readonly access: PasskeyAccess
        readonly ceremony: PasskeyCeremony
        readonly credential: PasskeyCredential
        readonly assertion: PasskeyAssertionVerified
      },
      prepare: PreparePasskeyCommit<PasskeyConsumeDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
    /** Delete at most limit expired challenges using database time. */
    readonly cleanup: <A>(
      input: { readonly moduleId: string; readonly limit: CleanupLimit },
      prepare: PreparePasskeyCommit<CleanupResult, A>
    ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
  }
>()("@effect/auth/PasskeyPersistence") {}
