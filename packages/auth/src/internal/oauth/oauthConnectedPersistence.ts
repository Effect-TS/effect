import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { PreparedCommit } from "../hooks/commit.ts"
import type { CleanupResult } from "../persistence/cleanup.ts"
import type { OAuthAccountRevision } from "./accountsModels.ts"
import type * as ConnectedModels from "./connectedModels.ts"
import type { PrepareOAuthCommit } from "./oauthSignInPersistence.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"
import type { OAuthClaimId, OAuthCleanupInput } from "./signInModels.ts"

type Mutation<A> = Effect.Effect<PreparedCommit<A>, OAuthUnavailable>

/** One native authority owns each mutation and its synchronous projection. Unknown
 * commit outcomes release no receipts and authorize no exchange or automatic retry.
 * Reads are advisory; final mutations guard the supplied revision and fixed deadline. */
export class OAuthConnectedPersistence extends Context.Service<
  OAuthConnectedPersistence,
  {
    /** One joined subject/authority/grant read. No token-use admission row. */
    readonly read: (input: ConnectedModels.OAuthConnectedReadInput) => Effect.Effect<
      | {
        readonly revision: OAuthAccountRevision
        readonly grant?: ConnectedModels.OAuthConnectedGrantSnapshot
        /** Expected policy revision captured by this read; checked before token decryption. */
        readonly policyRevision?: ConnectedModels.OAuthConnectedUseAuthorization["policyRevision"]
      }
      | undefined,
      OAuthUnavailable
    >
    readonly issue: <A>(
      input: ConnectedModels.OAuthConnectedFlow,
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedIssueDecision.Type, A>
    ) => Mutation<A>
    /** Exact live-flow DELETE with state/binder/issuer/engine-expiry predicates.
     * A confirmed consumed snapshot permits one exchange. */
    readonly consume: <A>(
      input: ConnectedModels.OAuthConnectedAccess,
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedConsumeDecision.Type, A>
    ) => Mutation<A>
    /** Unique ownership plus sealed grant write. Reconnect matches its original
     * grant/version and changes grantVersion. Sign-in retains before issuing a session. */
    readonly settle: <A>(
      input: ConnectedModels.OAuthConnectedSettlement,
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedSettlementDecision.Type, A>
    ) => Mutation<A>
    readonly list: (input: {
      readonly authorization: ConnectedModels.OAuthConnectedUseAuthorization
      readonly limit: (typeof ConnectedModels.OAuthConnectedList.Type)["limit"]
      readonly cursor?: string
    }) => Effect.Effect<typeof ConnectedModels.OAuthConnectedListResult.Type, OAuthUnavailable>
    /** Remove by exact subject/grant/grantVersion, independent of token rotation.
     * Optional revocation custody copies the persisted ciphertext in this owner.
     * Release ownership only when no concrete login/grant/job reference remains.
     * An already released or in-flight token cannot be recalled by this mutation. */
    readonly disconnect: <A>(
      input: {
        readonly key: ConnectedModels.OAuthConnectedGrantKey
        readonly grantVersion: ConnectedModels.OAuthConnectedTarget["grantVersion"]
        readonly authorization: ConnectedModels.OAuthConnectedActionAuthorization
      },
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedDisconnectDecision.Type, A>
    ) => Mutation<A>
    /** Match the original sealed snapshot, Active state and grant/token versions
     * in one conditional claim. No expired takeover or prerequisite grant reread.
     * A lost response authorizes no exchange. Deadline uses the database clock. */
    readonly claimRefresh: <A>(
      input: {
        readonly grant: ConnectedModels.OAuthConnectedStoredGrant
        readonly authorization: ConnectedModels.OAuthConnectedUseAuthorization
        readonly claimId: typeof OAuthClaimId.Type
        readonly nextTokenVersion: ConnectedModels.OAuthConnectedRefreshClaim["nextTokenVersion"]
        readonly lifetimeMillis: number
      },
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedRefreshDecision.Type, A>
    ) => Mutation<A>
    /** UPDATE only: exact original versions, claim, Refreshing state and deadline.
     * Late results never recreate a disconnected/reconnected grant. Unknown refresh
     * leaves material unusable; cleanup never restores Active. */
    readonly settleRefresh: <A>(
      input: {
        readonly claim: ConnectedModels.OAuthConnectedRefreshClaim
        readonly authorization: ConnectedModels.OAuthConnectedUseAuthorization
        readonly outcome: ConnectedModels.OAuthConnectedRefreshOutcome
      },
      prepare: PrepareOAuthCommit<typeof ConnectedModels.OAuthConnectedRefreshSettlement.Type, A>
    ) => Mutation<A>
    readonly cleanup: <A>(
      input: OAuthCleanupInput,
      prepare: PrepareOAuthCommit<CleanupResult, A>
    ) => Mutation<A>
  }
>()("@effect/auth/OAuthConnectedPersistence") {}
