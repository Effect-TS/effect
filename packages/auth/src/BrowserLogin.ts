/**
 * First-party browser login handoffs for native applications, including durable attempt recovery.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for an Apple application identifier.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  AppleAppId,
  /**
   * Creates Apple app-site association data for registered clients.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  appleAssociation
} from "./internal/browserLogin/appleAppLinks.ts"
export {
  /**
   * Service that opens a browser and receives its callback.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Browser,
  /**
   * Validates a browser callback against the active attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  callback,
  /**
   * Creates a native browser login client with durable recovery state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  makeClient,
  /**
   * Service that stores the active browser login attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Vault
} from "./internal/browserLogin/client.ts"
export {
  /**
   * Creates transport contracts for browser login handoffs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  makeContract
} from "./internal/browserLogin/contract.ts"
export {
  /**
   * Creates a first-party browser login handoff module.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  make
} from "./internal/browserLogin/server.ts"

export {
  /**
   * Schema and type for a native browser login attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Attempt,
  /**
   * Schema and type for browser handoff approval.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  AuthorizationDecision,
  /**
   * Schema and type for required browser session handling.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  BrowserSessionPolicy,
  /**
   * Schema and type for a registered client.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Client,
  /**
   * Error indicating invalid module configuration.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  ConfigurationError,
  /**
   * Schema and type for a browser login approval prompt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Description,
  /**
   * Schema for a hosted browser login URL.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  HostedUrl,
  /**
   * Schema for an exact HTTPS application return URL.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  HttpsReturnUrl,
  /**
   * Error indicating a handoff may already have issued a session.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Indeterminate,
  /**
   * Error indicating an invalid browser login attempt or request.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Invalid,
  /**
   * Service that persists module state and atomic transitions.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Persistence,
  /**
   * Error indicating a native browser, callback, or storage failure.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  PlatformError,
  /**
   * Schema for a cryptographically random handoff token.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Random,
  /**
   * Schema and type for durable module state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Record,
  /**
   * Schema for an exact registered application return URL.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  ReturnUrl,
  /**
   * Error indicating unavailable authentication infrastructure.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Unavailable,
  /**
   * Schema and type for stored browser login recovery state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  VaultRecord
} from "./internal/browserLogin/models.ts"
