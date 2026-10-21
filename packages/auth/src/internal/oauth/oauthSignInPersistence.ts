import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"
import type { CleanupResult } from "../persistence/cleanup.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"
import type {
  OAuthCleanupInput,
  OAuthConsumeDecision,
  OAuthCredentialSnapshot,
  OAuthExternalIdentity,
  OAuthIssueDecision,
  OAuthModuleId,
  OAuthSignInAccess,
  OAuthSignInFlow
} from "./signInModels.ts"

export type PrepareOAuthCommit<Value, A> = (
  value: Value,
  journal: CommitJournal
) => PreparedCommit<A>

/** One owner per mutation, synchronous prepare before physical commit. Unknown
 * outcomes discard receipts and never permit another exchange or session issue.
 * Standalone adapters reject ambient owners; explicit bound services share one. */
export class OAuthSignInPersistence extends Context.Service<
  OAuthSignInPersistence,
  {
    readonly issue: <A>(
      input: OAuthSignInFlow,
      prepare: PrepareOAuthCommit<OAuthIssueDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
    /** Conditional DELETE at engine time checks purpose, module, accepted generation,
     * provider, callback, state, exact binder and response issuer. Wrong access does
     * not consume. Return the exact deleted flow before any provider exchange. */
    readonly consume: <A>(
      input: OAuthSignInAccess,
      prepare: PrepareOAuthCommit<OAuthConsumeDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
    /** Joined current subject, OAuth credential and shared factor; an unknown
     * identity creates no row. Session issuance rechecks the captured authority. */
    readonly resolve: (input: {
      readonly moduleId: typeof OAuthModuleId.Type
      readonly identity: typeof OAuthExternalIdentity.Type
    }) => Effect.Effect<OAuthCredentialSnapshot | undefined, OAuthUnavailable>
    readonly cleanup: <A>(
      input: OAuthCleanupInput,
      prepare: PrepareOAuthCommit<CleanupResult, A>
    ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
  }
>()("@effect/auth/OAuthSignInPersistence") {}
