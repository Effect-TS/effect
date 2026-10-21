/**
 * Authentication lifecycle hooks and commit-aware delivery.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * A named lifecycle hook contribution without a specific identifier type.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyHookContribution,
  /**
   * Combines named lifecycle hook contributions into one validated hook configuration.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  composeHooks,
  /**
   * Named lifecycle hook handlers resolved from an application-supplied service.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type HookContribution,
  /**
   * Each contribution owns a distinct service key; only composeHooks creates LifecycleHooks.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  hookContribution,
  /**
   * Service identifier for resolving one named lifecycle hook contribution.
   *
   * @stability unstable
   * @category tags
   * @since 4.1.0
   */
  type HookContributionId,
  /**
   * Before-commit policy checks and after-commit event handlers for authentication lifecycle events.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type HookHandlers,
  /**
   * Service that checks lifecycle policy and delivers committed events in contribution order.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  LifecycleHooks
} from "./internal/hooks/lifecycleHooks.ts"

export {
  /**
   * Failure indicating that a prepared result belongs to a discarded commit.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  CommitDiscarded,
  /**
   * Transaction-owned journal for preparing results and staging lifecycle events before commit.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type CommitJournal,
  /**
   * Failure indicating that a prepared result was read before its commit settled.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  CommitPending,
  /**
   * A mutation result marked as either awaiting its owner’s commit or already committed.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type CommitResult,
  /**
   * Coordinates prepare, commit, settlement, and hook delivery for an authentication mutation.
   *
   * **Details**
   *
   * `owner` must resolve only after its real transaction or batch commits. Nested calls inherit the
   * outer journal; their events are discarded on failure and cannot dispatch until the outermost owner
   * succeeds. Wrap a caught savepoint rollback in its own coordinateCommit call so its events are
   * discarded too. Direct delivery is best effort: a process crash loses staged memory and no retry is
   * automatic. Post-commit delivery stays interruptible; a delivery failure never authorizes repeating
   * the committed operation.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  coordinateCommit,
  /**
   * Public operations may reject unsupported ambient execution before any mutation.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  hasCommitScope,
  /**
   * No value is exposed until the outermost transaction authority has committed.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PreparedCommit
} from "./internal/hooks/commit.ts"

export {
  /**
   * Failure indicating invalid or conflicting lifecycle hook contributions.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  HookConfigurationError,
  /**
   * Delivery status for one lifecycle event and one named hook contribution.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type HookDelivery,
  /**
   * Failure indicating that a committed lifecycle event could not be delivered to a hook.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  HookDeliveryFailed,
  /**
   * Failure indicating that a lifecycle policy check denied an action or could not run.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  HookDenied,
  /**
   * Schema for the authentication action represented by a lifecycle event.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LifecycleAction,
  /**
   * The owner supplies a stable, nonsecret identifier; delivery retries reuse this exact event.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LifecycleEvent,
  /**
   * Synchronous projection for native persistence prepare callbacks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  lifecycleEvent,
  /**
   * Schema for the identifier used to correlate a committed lifecycle event with its deliveries.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LifecycleEventId,
  /**
   * Deliberately excludes credentials, proofs, tokens, claims, and verification authority.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LifecycleSnapshot,
  /**
   * Synchronous projection for native persistence prepare callbacks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  lifecycleSnapshot
} from "./internal/hooks/models.ts"

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
