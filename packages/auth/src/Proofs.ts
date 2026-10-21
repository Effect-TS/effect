/**
 * Bounded, single-use authentication proofs and their delivery and redemption contracts.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Admission before target lookup for every email proof and password reset request. Auth supplies the
   * default Layer; provide this service to replace its policy. Trusted per-request network/device keys
   * come from ProofRequestContext, never payloads.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  HostIngressLimiter
} from "./internal/proofs/hostIngressLimiter.ts"
export {
  /**
   * Admission for private, process-local proof delivery.
   *
   * **Details**
   *
   * Proof Layers use the built-in scoped worker by default. Supply an override at Layer construction
   * only when the host needs different scheduling semantics.
   *
   * Accept work without awaiting the provider. Bound both pending work and execution; use an
   * application Scope that outlives requests, and never create daemon fibers. Every committed receipt,
   * including suppression, submits one task. Reject full/closed admission with ProofUnavailable,
   * without inspecting the task.
   *
   * Work has no remaining services or typed failures and contains no public result. Keep its closure
   * private: it contains credential material and is not an outbox value. Do not serialize, inspect,
   * log, or automatically retry it. Interruption still propagates; no delivery settlement transaction
   * runs. A host that requires work to start after sending the response must supply that release
   * boundary itself.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ProofDispatchScheduler
} from "./internal/proofs/proofDispatchScheduler.ts"
export {
  /**
   * Every schema-valid issue/candidate attempt spends action, identifier and known-subject token
   * buckets, including unknown targets, suppressed issuance and malformed candidate secrets. Host
   * ingress separately limits malformed requests. No refunds. Defaults retain up to 10,000 active
   * buckets and fail closed at capacity. Supply a shared RateLimiterStore for coordination across
   * replicas and restarts; action buckets are always process-local.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ProofLimiter
} from "./internal/proofs/proofLimiter.ts"
export {
  /**
   * Resolve a host-verified identity when a request needs proof admission. Auth HTTP supplies the
   * current socket peer by default. Raw callers and trusted proxy integrations provide a resolver per
   * invocation. Never accept these keys in operation payloads or install a caller in a shared auth
   * Layer.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ProofRequestContext
} from "./internal/proofs/proofRequestContext.ts"

export {
  /**
   * Schema binding a proof to the target identifier and the subject revision required for an identifier
   * change.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  IdentifierChangeProofBinding,
  /**
   * Schema binding an authentication proof to a specific login identifier and flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  IdentifierProofBinding,
  /**
   * Schema for the subject or identifier authority bound to a proof.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofBinding,
  /**
   * Schema for the identifier correlating one proof delivery attempt.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofDeliveryId,
  /**
   * Schema for provider acceptance, definite delivery rejection, or uncertain acceptance of a proof
   * message.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofDeliveryOutcome,
  /**
   * Schema for a proof digest and the key identifier used to derive it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofDigest,
  /**
   * Schema for the opaque identifier of a stored authentication proof.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofId,
  /**
   * Schema for an epoch-millisecond timestamp within the supported proof date range.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofInstant,
  /**
   * Schema for either a newly persisted proof or a privacy-preserving suppressed issuance.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofIssueDecision,
  /**
   * Issues timestamps come from the persistence owner's authoritative clock.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofIssueRecord,
  /**
   * Schema for the application-defined authentication purpose of a proof.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofPurpose,
  /**
   * Schema for a stored proof, its issue time, expiry, and redemption state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofRecord,
  /**
   * Schema for whether a single-use proof was redeemed or rejected.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofRedemptionDecision,
  /**
   * Schema for the proof, expected binding, candidate digest, and attempt limit checked during
   * redemption.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofRedemptionInput,
  /**
   * Same public shape for issued, ineligible, and throttled requests. Request IDs are correlation
   * only.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofReference,
  /**
   * Schema for the idempotency identifier of a proof request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofRequestId,
  /**
   * Schema for a proof request’s opaque reference and request identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofRequestReceipt,
  /**
   * Schema binding an authentication proof to a subject revision, login identifier, and flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectProofBinding
} from "./internal/proofs/models.ts"

export {
  /**
   * Callback that prepares a proof persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PrepareProofCommit,
  /**
   * One current code per canonical identifier/subject series. Every mutation owns or joins the real
   * transaction/batch and prepares its receipt before commit. Use the database clock for
   * expiry/cooldown, and exact canonical binding bytes. Core admission charges every schema-valid
   * request before these commands; no SQL budget graph.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ProofPersistence
} from "./internal/proofs/proofPersistence.ts"

export {
  /**
   * Private process-local delivery. Never serialize its credential-bearing closure. Read only after
   * its outer owner commits. Repeated reads share one schedule/work execution; crash, queue rejection
   * or interruption may leave a code unsent.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PreparedProofDispatch,
  /**
   * Prepared proof-issuance commit that yields the private dispatch work only after persistence settles.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofIssuePlan,
  /**
   * Reads a prepared proof persistence result after its owner commits.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  readProofCommit
} from "./internal/proofs/dispatch.ts"

export {
  /**
   * Default proof lifetimes and abuse limits. Enforcement remains server-side.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultProofPolicy,
  /**
   * Schema for proof issuance and verification budgets across identifiers, subjects, and actions.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofAbusePolicy,
  /**
   * Schema for a maximum number of proof operations within a time window.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofBudget,
  /**
   * Schema for proof expiry, failed-attempt limits, and abuse-control budgets.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofPolicy,
  /**
   * Validates proof policy and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateProofPolicy
} from "./internal/proofs/policy.ts"

export {
  /**
   * Structured composite keys. Every dimension is independent of flow, context, request, and proof
   * IDs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofAbuseScope,
  /**
   * Builds admission keys that scope proof requests to their module, purpose, and binding.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  proofAbuseScope
} from "./internal/proofs/abuse.ts"

export {
  /**
   * Failure indicating that the installed proof implementation cannot provide a required capability.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  ProofCapabilityUnsupported,
  /**
   * Failure indicating invalid proof lifetime, secret format, or admission policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  ProofConfigurationError,
  /**
   * Schema for proof rejection, unavailable capabilities, unsupported operations, and denied ingress.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofError,
  /**
   * Failure indicating that the host’s proof ingress policy rejected the request.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  ProofIngressDenied,
  /**
   * Failure indicating that a proof is invalid, expired, already redeemed, or bound to different
   * authority.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  ProofInvalid,
  /**
   * Failure indicating that proof storage, cryptography, or dispatch could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  ProofUnavailable
} from "./internal/proofs/errors.ts"

export {
  /**
   * Private digest-bearing plan, never serialized. The mutation owner locks the subject first,
   * rechecks authority once, then redeems and writes atomically. Report redeemed only if both deletion
   * and protected write apply. A failed write rolls back deletion. D1 compiles equivalent guards;
   * prepare only projects a precomputed decision synchronously, never executes arbitrary batch
   * callbacks. Keep the original flow/binding and proof ID for final coordinated checks.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofRedemptionPlan
} from "./internal/proofs/redemption.ts"

export {
  /**
   * Capability that submits a private proof message once and reports provider acceptance without
   * assuming recipient delivery.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofDelivery,
  /**
   * Private proof message containing recipient, redacted secret, format, expiry, template, and locale.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofDeliveryMessage
} from "./internal/proofs/delivery.ts"

export {
  /**
   * Creates proof credential generation, digesting, and verification operations.
   *
   * **Details**
   *
   * Token proofs need only entropy and SHA digests; numeric proofs additionally require Mac and an
   * owning Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeProofCrypto,
  /**
   * Active and retained keys used by proof.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofKeyring,
  /**
   * Shared numeric-code verification keys. Keep old IDs until their proofs expire.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ProofKeys,
  /**
   * Schema selecting a high-entropy token or a numeric code with an explicit length.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ProofSecretPolicy,
  /**
   * Validates proof binding and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateProofBinding
} from "./internal/proofs/crypto.ts"

export {
  /**
   * Creates a proof definition with a binding schema, policy, and secret format.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make
} from "./internal/proofs/definition.ts"
export {
  /**
   * The consumer owns number/country eligibility, sender identity and vendor spend policy.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SmsProofDelivery
} from "./internal/proofs/smsProofDelivery.ts"
