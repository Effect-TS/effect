/**
 * Persistence diagnostics, cleanup contracts, and default authentication services.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Current journal for internal transaction operations. Public commit-owner continuations still
   * receive the journal explicitly at the native boundary.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  CurrentCommitJournal
} from "./internal/hooks/commit.ts"

export {
  /**
   * Schema for a sanitized diagnostic identifying the authentication stage that failed.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthDiagnostic,
  /**
   * Marks a failure as already reported to avoid duplicate diagnostics.
   *
   * **Details**
   *
   * Mark reasons after reporting their private Cause. This suppresses duplicate diagnostics; it does
   * not redact values. Newly composed cleanup reasons stay unmarked and must still be reported before
   * any public projection.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  markAuthFailureReported,
  /**
   * Reports a sanitized authentication diagnostic to the configured sink.
   *
   * **Details**
   *
   * Only fixed fields enter diagnostics; logging defects cannot change authentication.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  reportAuthDiagnostic,
  /**
   * Reports an authentication failure without exposing credential material.
   *
   * **Details**
   *
   * Keep Effect's content-free frames, never failure values or arbitrary annotations.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  reportAuthFailure,
  /**
   * Reports a sanitized persistence failure to the configured diagnostic sink.
   *
   * **Details**
   *
   * Report unexpected persistence reasons, preserving original failure values. By default the
   * identical Cause is returned. Adapters that forward failures to another Auth boundary can mark
   * classified reasons: reported failures and deliberately expected errors must not generate another
   * capture downstream. Later finalizer failures remain unmarked and are reported independently.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  reportPersistenceFailure
} from "./internal/shared/diagnostics.ts"

export {
  /**
   * Layer that supplies hooks layer.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  hooksLayer
} from "./internal/auth/defaults.ts"
export {
  /**
   * Creates a rate limiter store backed by authentication key-value storage.
   *
   * **Details**
   *
   * Auth token buckets in any Effect `KeyValueStore`, such as Workers KV or Redis. Each check reads,
   * refills, consumes and writes back one entry. That is not atomic: concurrent checks and replication
   * lag can admit a few extra requests. A read, write or decode failure denies the request. An idle
   * bucket refills to full when next read, so expiry only bounds storage: give entries a TTL at least
   * as long as the longest window. Entries are keyed by a SHA-256 digest of the bucket key, a fixed
   * short length that carries no identifiers. Supports the one-token buckets auth uses.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  keyValueRateLimiterStore
} from "./internal/auth/rateLimiter.ts"
export {
  /**
   * Schema for the maximum number of expired records removed in a cleanup batch.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  CleanupLimit,
  /**
   * Schema for the number of removed records and whether cleanup may have more work.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  CleanupResult
} from "./internal/persistence/cleanup.ts"
