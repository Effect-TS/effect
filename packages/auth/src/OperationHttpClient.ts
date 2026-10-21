/**
 * HTTP clients and private credential transport for authentication operations.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * One transport instance per application or request Scope. Provide its Layer to consumers so
   * credential admission and generation fencing share an owner.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  Client,
  /**
   * Layer that supplies an HTTP authentication operation client.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer,
  /**
   * Creates a scoped HTTP client for authentication operations.
   *
   * **Details**
   *
   * One instance owns credential ordering and stale-result fencing. Share it within an authentication
   * lifetime. Supply a non-retrying, non-redirecting HttpClient; each call owns its request Scope,
   * including response consumption.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Native credential storage, separate from HTTP header configuration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeCredentials,
  /**
   * Per-call subject transition settings and a callback run during credential settlement.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OperationCallOptions,
  /**
   * Client that invokes HTTP authentication routes and coordinates private credentials and subject
   * transitions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OperationFetchClient,
  /**
   * Base URL, CSRF configuration, request bounds, credential handling, and dependencies for an HTTP
   * operation client.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OperationFetchOptions,
  /**
   * Client-owned finite reveal storage. Its Layer owns allocation and disposal.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PrivateOutput
} from "./internal/httpOperation/client.ts"
