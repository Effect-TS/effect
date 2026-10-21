/**
 * OAuth and OpenID Connect sign-in, account linking, registration, and retained grants.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for the subject security revision and credential revisions captured for an OAuth account
   * action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthAccountRevision,
  /**
   * Schema for account-linking flow limits, action evidence age, and unlinking invalidation
   * requirements.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthAccountsPolicy,
  /**
   * Schema for accepted OAuth action evidence, its source, and a fixed authorization expiry.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthActionAuthorization,
  /**
   * Schema binding a link or unlink action to its intent digest, request, and subject revision.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthActionChallenge,
  /**
   * Schema for the encoded digest of an OAuth account action’s intent or request binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthActionDigest,
  /**
   * Failure indicating that an OAuth account action requires additional authentication evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthActionRequired,
  /**
   * Session is accepted only with its exact private provenance, validated by the application
   * authority. Public assurance ordinals never identify credentials.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthActionSource,
  /**
   * Schema identifying an OAuth login credential by module, subject, and credential identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCredentialKey,
  /**
   * Schema for validated access to an account-linking flow, including subject ownership and request
   * binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkAccess,
  /**
   * Schema for starting account linking with sign-in parameters and optional action evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkBegin,
  /**
   * Schema for completing an account-linking flow with its provider callback and private request
   * credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkComplete,
  /**
   * Schema for either an atomically consumed account-linking flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkConsumeDecision,
  /**
   * Schema for an account-link result: linked credential, rejected action, or identity conflict.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkDecision,
  /**
   * Schema for the linked credential, whether it changed, and the application return target.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinked,
  /**
   * A login identity, distinct from a retained provider API grant. These exact nonsecret fields are
   * safe for display; credentialId is the unlink target.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkedAccount,
  /**
   * Schema for bounded, cursor-based listing of the authenticated subject’s linked login accounts.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkedAccountsList,
  /**
   * Schema for a page of linked login accounts and its continuation cursor.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkedAccountsListResult,
  /**
   * Private persistence input. The invocation comes from verified Auth context, never the public
   * payload. Recheck metadata policy and current ownership at read.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkedAccountsRead,
  /**
   * Schema for account-linking authority and the encrypted secrets needed to finish that flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkFlow,
  /**
   * Hash this intent before authorizing it; the final encrypted context then includes the accepted
   * authorization without a self-referential digest.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkIntentContext,
  /**
   * Schema for either a newly issued account-linking flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkIssueDecision,
  /**
   * Schema for successful account linking or cancellation, including the application return target.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkResult,
  /**
   * Schema for the account-linking intent and accepted action authorization authenticated with its
   * encrypted secrets.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLinkTransactionContext,
  /**
   * Schema identifying a login credential to unlink, an idempotency command, and optional action
   * evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthUnlink,
  /**
   * Schema for successful unlinking, rejection, or refusal to remove the last sign-in method.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthUnlinkDecision,
  /**
   * Schema for the removed login credential and the resulting session invalidation window.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthUnlinked
} from "./internal/oauth/accountsModels.ts"

export {
  /**
   * Mutations commit with one physical owner. Reads are nonconsuming snapshots. Unknown outcomes
   * release no receipts and never authorize automatic retry.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthAccountsPersistence
} from "./internal/oauth/oauthAccountsPersistence.ts"
export {
  /**
   * Application action authority; no default grants access. Verify the exact challenge and revisions.
   * A one-shot proof is consumed in its own authority. Recent session step-up may be accepted only
   * after matching this invocation to its real private provenance, factor IDs/revisions and original
   * proof times; public assurance ordinals must never be converted into credential IDs. Return Session
   * source with the exact session ID and authenticatedAt. Core also checks both authentication and
   * factor freshness. Link retains this begin authorization and requires no second proof at
   * completion. Pending/registration capabilities do not authorize account changes. Counter
   * consumption need not replace semantic credential revision; replacement, revocation and
   * policy/binding changes must advance the corresponding revisions. A later OAuth CAS rejection does
   * not refund a factor or imply an atomic join.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthActionEvidence
} from "./internal/oauth/oauthActionEvidence.ts"

export {
  /**
   * Stable identifier of one configured OAuth provider ("github", "gitlab"). Doubles as the routing
   * key for callback endpoints, so it is constrained to URL-safe lowercase slugs.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthProviderKey
} from "./internal/oauth/schema.ts"

export {
  /**
   * Default OAuth sign in policy.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultOAuthSignInPolicy,
  /**
   * Schema for supported authorization prompts: none, login, consent, or account selection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthAuthorizationPrompt,
  /**
   * Schema for a redacted authorization URL that may contain private transaction values.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthAuthorizationUrl,
  /**
   * Schema for the identifier of an explicitly configured OAuth callback.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCallbackId,
  /**
   * Schema for either an authorization-code callback or a sanitized provider error.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCallbackResponse,
  /**
   * Schema for the random identifier of a claimed OAuth refresh or revocation job.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthClaimId,
  /**
   * Schema selecting an OAuth module and the maximum number of expired records to remove.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCleanupInput,
  /**
   * Schema for an authorization code and the validated metadata returned with its provider callback.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCodeResponse,
  /**
   * Schema for the idempotency command identifier of an OAuth mutation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCommandId,
  /**
   * Schema for either an atomically consumed OAuth sign-in flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConsumeDecision,
  /**
   * Schema for an OAuth credential and the current subject authority used to authorize it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthCredentialSnapshot,
  /**
   * Provider-supplied metadata, never local identity or linking authority. Adapters project identity
   * responses into this bounded JSON snapshot; tokens and protocol secrets do not belong here.
   * Applications select their own public session claims.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthDisplayProfile,
  /**
   * Schema for the identifier selecting the key that protects an OAuth envelope.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthEncryptionKeyId,
  /**
   * Schema for a provider, issuer, and subject identifier verified by OAuth or OpenID Connect.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthExternalIdentity,
  /**
   * Schema for a non-negative, safe-integer epoch-millisecond timestamp used by OAuth flows.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthInstant,
  /**
   * Schema for either a newly persisted OAuth sign-in flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthIssueDecision,
  /**
   * Schema for an OAuth issuer identifier whose exact spelling is retained for comparison.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthIssuer,
  /**
   * Schema for the bounded login hint forwarded to an authorization provider.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthLoginHint,
  /**
   * Schema for the namespace identifying an OAuth authentication module.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthModuleId,
  /**
   * Schema for the provider, protocol generation, issuer policy, and callback configuration captured by
   * a flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthProtocolConfiguration,
  /**
   * Schema selecting plain OAuth or OpenID Connect identity verification.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthProtocolKind,
  /**
   * Schema for captured protocol configuration, authorization URL, private secrets, and callback
   * response mode.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthProtocolPreparation,
  /**
   * Schema for a bounded redirect URI without a fragment, whitespace, or control characters.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRedirectUri,
  /**
   * Schema for the application return target retained across an OAuth flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthReturnTarget,
  /**
   * Schema for an encrypted OAuth transaction with its format, key identifier, nonce, and ciphertext.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSealedTransaction,
  /**
   * Schema for the provider, callback, state, and request-binding authority needed to access a sign-in
   * flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInAccess,
  /**
   * Schema for a sign-in flow identifier, private authorization URL, and expiry.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInAuthorization,
  /**
   * Schema for a new sign-in flow identifier and its requested provider and authorization parameters.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInBegin,
  /**
   * Schema for an OAuth callback together with the selected provider, callback identifier, and private
   * request binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInComplete,
  /**
   * The stored flow is deleted before the single provider exchange.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInFlow,
  /**
   * Public sign-in request. The server generates its flow identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInInput,
  /**
   * Schema for OAuth flow generation, lifetime, and bounded token-exchange duration.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInPolicy,
  /**
   * Schema for sign-in authority and captured provider policy authenticated with the flow’s encrypted
   * secrets.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthSignInTransactionContext,
  /**
   * Schema for private OAuth state and optional PKCE verifier and OpenID Connect nonce.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthTransactionSecrets,
  /**
   * Schema for a verified provider identity, optional upstream authentication time, and public profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthVerifiedExternalIdentity
} from "./internal/oauth/signInModels.ts"

export {
  /**
   * Failure indicating invalid OAuth flow, provider, or account-management configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthConfigurationError,
  /**
   * Failure indicating that the requested OAuth authentication or account-management capability is not
   * installed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthMethodUnsupported,
  /**
   * Failure indicating that the provider callback, token response, or verified identity was rejected.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthProtocolRejected,
  /**
   * Failure indicating rejection of an OAuth flow or account-management action.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthRejected,
  /**
   * Failure indicating that OAuth protocol work, cryptography, or storage could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthUnavailable
} from "./internal/oauth/signInErrors.ts"

export {
  /**
   * Schema for validated access to a connected-account flow, including subject ownership and request
   * binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedAccess,
  /**
   * Schema for accepted evidence authorizing a specific connected-account action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedActionAuthorization,
  /**
   * Schema binding connect, completion, or disconnect authority to an intent, request, and subject
   * revision.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedActionChallenge,
  /**
   * Failure indicating that a connected-account operation requires additional authentication evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthConnectedActionRequired,
  /**
   * Schema for starting a connect or reconnect flow with a permission profile, callback, and action
   * evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedBegin,
  /**
   * Failure indicating that another worker currently owns the connected grant’s refresh claim.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthConnectedBusy,
  /**
   * Schema for completing a connected-account flow with the provider callback and action evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedComplete,
  /**
   * Schema for captured provider protocol configuration and the grant’s permission profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedConfiguration,
  /**
   * Schema for either an atomically consumed connected-account flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedConsumeDecision,
  /**
   * Schema for the verified provider identity information retained to validate later token refreshes.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedContinuation,
  /**
   * Schema identifying a retained grant to disconnect, an idempotency command, and optional action
   * evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedDisconnect,
  /**
   * Schema for successful grant disconnection or rejection of the disconnect action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedDisconnectDecision,
  /**
   * Schema for a disconnected grant and the status of its remote token revocation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedDisconnected,
  /**
   * Schema for the grant key and expected version captured before disconnection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedDisconnectIntent,
  /**
   * Schema for connected-account authority and the encrypted secrets needed to finish its authorization
   * flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedFlow,
  /**
   * Schema identifying a retained OAuth grant by module, subject, and grant identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedGrantKey,
  /**
   * Schema for verified provider identity, granted permissions, expiry metadata, and private token
   * material.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedGrantResponse,
  /**
   * Advisory joined read; only a successful refresh CAS authorizes exchange.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedGrantSnapshot,
  /**
   * Schema selecting a new provider connection or replacement of an existing grant with a permission
   * profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedIntent,
  /**
   * Digest this immutable intent before adding its accepted begin authorization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedIntentContext,
  /**
   * Schema for either a newly issued connected-account authorization flow or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedIssueDecision,
  /**
   * Schema for bounded, cursor-based listing of retained grants.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedList,
  /**
   * Schema for a page of public retained-grant summaries and its continuation cursor.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedListResult,
  /**
   * Schema for flow and refresh-claim lifetimes, action evidence age, and allowed permission profiles.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedPolicy,
  /**
   * Schema for a versioned provider permission profile with scopes, resources, and token-retention
   * policy.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedProfile,
  /**
   * Indexed target selection; an omitted selector captures only subject authority.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedReadInput,
  /**
   * Failure indicating that a retained grant needs a new user authorization before it can be used.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OAuthConnectedReauthorizationRequired,
  /**
   * Schema for exclusive refresh ownership, the expected grant, claim expiry, and next token version.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRefreshClaim,
  /**
   * Schema for refresh ownership granted, already busy, requiring reauthorization, or rejected.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRefreshDecision,
  /**
   * Schema for a refreshed grant or a requirement to obtain fresh user authorization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRefreshOutcome,
  /**
   * Schema for a persisted refresh result, required reauthorization, or rejection of stale refresh
   * ownership.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRefreshSettlement,
  /**
   * Schema for the bounded resource identifiers requested by or associated with a retained grant.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedResources,
  /**
   * Schema for a newly connected grant or cancellation, including the application return target.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedResult,
  /**
   * Disconnect copies the exact persisted ciphertext; decrypt with grant.context. Remote revocation
   * may affect a later provider authorization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRevocationJob,
  /**
   * Schema for the bounded OAuth scope tokens requested by or granted to a retained connection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedScopes,
  /**
   * Schema for an encrypted token envelope with its format, encryption key identifier, nonce, and
   * private ciphertext.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedSealedTokens,
  /**
   * Consumed flows cannot be retried after an unknown exchange or commit.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedSettlement,
  /**
   * Schema for committing a connected grant, rejecting it, or detecting a conflicting identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedSettlementDecision,
  /**
   * Schema for a retained grant’s authenticated context and encrypted token envelope.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedStoredGrant,
  /**
   * Schema for public grant metadata, including provider, permissions, expiry, and connection status.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedSummary,
  /**
   * Schema for the grant versions, provider identity, and configuration captured by a reconnect
   * operation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedTarget,
  /**
   * Schema for subject and grant authority, provider configuration, versions, and token metadata
   * authenticated by an envelope.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedTokenContext,
  /**
   * Schema for private access and refresh tokens together with verified provider continuity information.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedTokenMaterial,
  /**
   * Schema for granted permissions, token expiry, permitted-use deadlines, and acquisition time.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedTokenMetadata,
  /**
   * Schema for the connect or reconnect intent and accepted action authorization authenticated with its
   * encrypted secrets.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedTransactionContext,
  /**
   * Schema selecting a retained grant and the permission profile required to use it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedUse,
  /**
   * Schema for subject and policy authority, purpose, and expiry accepted before reading or using a
   * retained grant.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedUseAuthorization,
  /**
   * Schema for the opaque identifier of a retained OAuth grant.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthGrantId,
  /**
   * Schema for the application-defined key of an OAuth permission and retention profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthPermissionProfileKey
} from "./internal/oauth/connectedModels.ts"

export {
  /**
   * Schema for authentication, grant availability, refresh ownership, and reauthorization failures when
   * accessing a retained grant.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedAccessFailure
} from "./internal/oauth/connectedAccess.ts"
export {
  /**
   * Independent exact-action authority. Consume one-time evidence before returning; later connected
   * CAS loss does not refund it. No session-summary default.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedActionEvidence
} from "./internal/oauth/oauthConnectedActionEvidence.ts"
export {
  /**
   * One native authority owns each mutation and its synchronous projection. Unknown commit outcomes
   * release no receipts and authorize no exchange or automatic retry. Reads are advisory; final
   * mutations guard the supplied revision and fixed deadline.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedPersistence
} from "./internal/oauth/oauthConnectedPersistence.ts"
export {
  /**
   * Explicit server-only token capability; ordinary OAuthProtocol stays token-free. All
   * provider/identity/refresh/revocation HTTP stays outside database owners. Exact retained config and
   * fixed profiles only. No automatic exchange retry. Refresh validates original identity, optional
   * OIDC nonce/auth_time and permissions; it never upgrades authentication freshness. Unknown outcomes
   * are unavailable. Revocation reports Confirmed only under the declared provider cohort contract.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedProtocol
} from "./internal/oauth/oauthConnectedProtocol.ts"

export {
  /**
   * Schema for exclusive ownership and expiry of a claimed remote token-revocation job.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRevocationClaim,
  /**
   * Schema for either a claimed remote revocation job or an empty work queue.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthConnectedRevocationDecision,
  /**
   * Optional durable revocation authority sharing Disconnect's physical store. Claimed attempts never
   * overlap by expired takeover. Unknown outcomes do not authorize automatic retries. Provider-wide
   * revocation can affect authorization obtained after this job; no local ordering fence can retract
   * an external token.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedRevocations
} from "./internal/oauth/oauthConnectedRevocations.ts"

export {
  /**
   * Active and retained keys used by OAuth connected token.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedTokenKeyring,
  /**
   * Explicit encrypted long-lived tokens; dedicated key retention covers all live grants and
   * unresolved refresh/revocation work. Fixed typed AAD, no raw context. Layer teardown cancels and
   * joins active operations before wiping keys; later calls fail with OAuthUnavailable.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedTokenProtector
} from "./internal/oauth/oauthConnectedTokenProtector.ts"

export {
  /**
   * Separate connected purpose. Key retention includes live flow deadlines. Layer teardown cancels and
   * joins active operations before wiping keys; later calls fail with OAuthUnavailable.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedTransactionProtector
} from "./internal/oauth/oauthConnectedTransactionProtector.ts"
export {
  /**
   * Application policy runs before any token is opened. Token use receives the detached, frozen
   * authority/grant snapshot already read by core; a captured policyRevision binds the returned
   * authorization. Metadata policy obtains its own authority as needed. Mutations recheck captured
   * revisions, current policy and the fixed horizon. A snapshot cannot strengthen independent
   * application policy consistency beyond its own validity.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthConnectedUseAuthority
} from "./internal/oauth/oauthConnectedUseAuthority.ts"

export {
  /**
   * Typed authenticated-link domain, isolated from guest sign-in. Layer teardown cancels and joins
   * active operations before wiping keys; later calls fail closed. Dedicated keyring retention covers
   * issued and claimed link horizons and deployment convergence; link-binder signing keys have their
   * own independent retention obligation.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthLinkTransactionProtector
} from "./internal/oauth/oauthLinkTransactionProtector.ts"

export {
  /**
   * Configured protocol authority. Resolve exact captured configuration generations;
   * preparation/exchange run outside persistence owners. Discard all provider tokens in sign-in
   * adapters; profile/email never selects application identity. The adapter owns canonical issuer,
   * exact configured redirect, fixed provider authorization origin/parameters, S256 and nonce
   * validation, and retention of each configuration generation through its issued flow horizon. Never
   * discover a caller-supplied issuer or substitute a newer configuration at completion. No network
   * implementation is installed by the core method.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthProtocol
} from "./internal/oauth/oauthProtocol.ts"

export {
  /**
   * Schema for validated access to a deferred registration, including its reference, flow, bearer
   * digest, and request binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationAccess,
  /**
   * A first accepted command atomically reaches one bound outcome. There is no resettable intermediate
   * state that permits a second provisioning attempt. Bound outcomes retain the original payload and
   * stable provisioning request ID. Replay returns outcome metadata only, with no provisioning, event
   * or new credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationApplication,
  /**
   * Private first-winner handoff; never persist it or reconstruct it from a replay.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationAuthentication,
  /**
   * Schema for the encoded digest of a private deferred-registration credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationBearerDigest,
  /**
   * Schema for the redacted high-entropy credential required to complete deferred OAuth registration.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationCredential,
  /**
   * Schema for accepted, replayed, rejected, or conflicting deferred registration, with authentication
   * issued only once.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationDecision,
  /**
   * Schema for the fingerprint used to bind deferred registration to captured application input.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationFingerprint,
  /**
   * Schema for a deferred registration intent and its current application-side acceptance state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationInspection,
  /**
   * Immutable restricted capability. Application data is first bound by register, never by the OAuth
   * callback; this record contains no plaintext bearer or tokens.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationIntent,
  /**
   * Schema for deferred-registration lifetime, maximum verification age, and replay-record retention.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationPolicy,
  /**
   * Schema for the private credentials and command required to inspect or complete deferred
   * registration.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationPrivateInput,
  /**
   * Schema for the public high-entropy reference identifying a deferred registration record.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationReference,
  /**
   * Schema for the idempotency identifier of an application-side OAuth registration request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationRequestId,
  /**
   * Schema for a deferred-registration continuation, its public reference, expiry, and return target.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationRequired,
  /**
   * Metadata-only acceptance, including every replay after an uncertain outcome.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationResult,
  /**
   * Creates the completion-result schema for deferred OAuth registration.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  registrationCompletionResult
} from "./internal/oauth/registrationModels.ts"

export {
  /**
   * Optional restricted intent issuance after a consumed sign-in flow and one verified provider
   * exchange. Check unknown full-tuple ownership and eligibility in the inserting owner; disabled or
   * connected-only ownership is not unknown. No unknown-identity reservation is created and no subject
   * is provisioned here. Confirm the exact binder, identity and immutable horizons before releasing
   * the private registration credential. An unknown commit releases none and never authorizes another
   * exchange or automatic intent issuance.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthRegistrationIntents,
  /**
   * Schema for either a newly issued deferred-registration intent or rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OAuthRegistrationIssueDecision
} from "./internal/oauth/oauthRegistrationIntents.ts"

export {
  /**
   * Opt-in API access. No login factor/session creation or token-bearing RPC.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  makeOAuthConnected as makeConnectedModule
} from "./internal/oauth/connected.ts"
export {
  /**
   * Application authority; resolve before issuance and retain that exact route. The callback cannot
   * select a replacement. Core never performs redirects.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthReturnTargets
} from "./internal/oauth/oauthReturnTargets.ts"
export {
  /**
   * One owner per mutation, synchronous prepare before physical commit. Unknown outcomes discard
   * receipts and never permit another exchange or session issue. Standalone adapters reject ambient
   * owners; explicit bound services share one.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthSignInPersistence,
  /**
   * Callback that prepares a OAuth persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PrepareOAuthCommit
} from "./internal/oauth/oauthSignInPersistence.ts"
export {
  /**
   * Dedicated transaction encryption. Layer teardown cancels and joins active operations before wiping
   * keys; calls after teardown fail with OAuthUnavailable. Retain retired keys through every pending
   * and claimed flow horizon and deployment convergence; binder signing keys have an independent
   * retention obligation. Never reuse session or connected-token keys. Redacted prevents formatting,
   * not memory disclosure or JavaScript zeroization.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OAuthTransactionProtector
} from "./internal/oauth/oauthTransactionProtector.ts"
export {
  /**
   * Creates OAuth sign-in operations bound to a session module.
   *
   * **Details**
   *
   * Guest sign-in only. Durable flow/identity authority, configured protocol, separate transaction
   * encryption and request-binding signing are explicit Layers. This installs no provider, database,
   * registration or connected-token capability.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthMethod as makeModule
} from "./internal/oauth/signInModule.ts"
export {
  /**
   * Active and retained keys used by OAuth transaction.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthTransactionKeyring
} from "./internal/oauth/transactionKeyring.ts"

export {
  /**
   * Creates an OAuth sign-in strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Creates an OAuth account linking and unlinking strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeAccounts,
  /**
   * Creates an OAuth strategy for retained grants and connected account access.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeConnected,
  /**
   * Creates an OAuth strategy for deferred application registration.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeRegistration,
  /**
   * Namespace and policy for an OAuth account linking and unlinking strategy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OAuthAccountsOptions,
  /**
   * Namespace and policy for retaining, refreshing, and using connected OAuth grants.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OAuthConnectedOptions,
  /**
   * Namespace, sign-in policy, provider profile schemas, and optional token-retention profile for an
   * OAuth strategy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OAuthOptions,
  /**
   * OAuth sign-in settings extended with the application registration schema and deferred-registration
   * policy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OAuthRegistrationOptions
} from "./internal/oauth/definition.ts"

export {
  /**
   * Freezes a detached, validated graph before retaining it or passing it to a callback. This does not
   * validate or copy input; use snapshotOAuth to do both.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  freezeOAuth,
  /**
   * Validates and snapshots OAuth before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotOAuth,
  /**
   * Validates and snapshots OAuth sync before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotOAuthSync
} from "./internal/oauth/signInSnapshot.ts"

export {
  /**
   * Selects the configured OAuth callback for an authentication attempt.
   *
   * **Details**
   *
   * An explicit callback must match exactly. Otherwise use the provider-named callback or an
   * unambiguous single destination; array order is not policy.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  selectCallback
} from "./internal/oauth/callback.ts"
export type {
  /**
   * Narrow by provider before reading provider-specific data. Missing metadata stays absent; verified
   * profile email never establishes linking authority.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OAuthClaimsIdentity,
  /**
   * Provider keys must match the configured protocol. Schemas describe the adapter's bounded JSON
   * projection, not the raw token or API response.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OAuthProviderProfiles
} from "./internal/oauth/profiles.ts"
export type {
  /**
   * A server-side provider declaration. The host supplies its stable provider key and exact callback
   * destinations; the adapter owns discovery and exchanges. Importing this contract does not load any
   * optional protocol implementation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  ProviderDefinition
} from "./internal/oauth/providerDefinition.ts"

export {
  /**
   * Low-level OAuth 2.0 authorization and token exchange APIs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OAuth,
  /**
   * Low-level OAuth protocol errors.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OAuthError,
  /**
   * Low-level OAuth provider configuration and discovery APIs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OAuthProvider,
  /**
   * Low-level OpenID Connect discovery and ID-token validation APIs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Oidc,
  /**
   * Proof Key for Code Exchange generation and verification APIs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Pkce
} from "./oauth/index.ts"
