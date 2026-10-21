/**
 * HTTP server handlers for authentication operations and their credentials.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Layer that resolves the authentication invocation for an incoming operation.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  invocationLayer,
  /**
   * Service that resolves request credentials into an authentication invocation and owns session-cache
   * access.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OperationHttpInvocation
} from "./internal/httpOperation/operationHttpInvocation.ts"
export {
  /**
   * Creates an HTTP handler for authentication operations and optional OAuth callbacks.
   *
   * **Details**
   *
   * Retain transport configuration and caller resolution only. Supply operation, codec and callback
   * services to each handle invocation instead of construction.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Creates an OAuth callback route with explicit request-binding and redirect policy.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthCallback,
  /**
   * OAuth callback route with flow lookup, provider identity, response rendering, and redirect policy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OAuthHttpCallback
} from "./internal/httpOperation/server.ts"

export {
  /**
   * Creates a layer that validates and supplies HTTP credential transport configuration.
   *
   * **Details**
   *
   * Invalid settings expose only a bounded component name, never their values.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  configurationLayer,
  /**
   * Creates cookie settings for each authentication credential slot.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  cookieConfiguration,
  /**
   * Creates header names for each credential slot using a shared prefix.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  headerConfiguration,
  /**
   * Service supplying validated credential cookies or headers and HTTP request security policy.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  OperationHttpServerConfig
} from "./internal/httpOperation/operationHttpServerConfig.ts"

export type {
  /**
   * Private incoming credential values indexed by their authentication transport slot.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  HttpCredentials,
  /**
   * Cookie name, scope, security flags, and optional domain for an authentication credential.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OperationCookie,
  /**
   * Configuration for operation HTTP.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OperationHttpConfiguration
} from "./internal/httpOperation/models.ts"
