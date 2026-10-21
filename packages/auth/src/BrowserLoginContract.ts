/**
 * Transport contracts and validated messages for browser login handoffs.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates transport contracts for browser login handoffs.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  makeContract as make
} from "./internal/browserLogin/contract.ts"

export {
  /**
   * Schema and type binding a native request to its attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Binding,
  /**
   * Schema and type for a registered client.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Client,
  /**
   * Error indicating a handoff may already have issued a session.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Indeterminate,
  /**
   * Schema and type for starting a browser login attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Initiate,
  /**
   * Error indicating an invalid browser login attempt or request.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Invalid,
  /**
   * Schema and type for the newly created attempt.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Started,
  /**
   * Schema and type for the current handoff status.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Status,
  /**
   * Error indicating unavailable authentication infrastructure.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Unavailable
} from "./internal/browserLogin/models.ts"
