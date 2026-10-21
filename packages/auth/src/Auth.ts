/**
 * Authentication services that combine named strategies with shared session authority.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Typed method API assembled from the selected authentication strategies.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthApi,
  /**
   * Identifier for a constant auth service. The stable name also isolates its credentials.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthService,
  /**
   * Creates a yieldable auth service from a shared contract or service identifier. Use its Layer for
   * provisioning, or yield its make Effect for direct construction. AuthRequest is resolved when a
   * method executes.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Configuration for shared claims, named strategies, and session authority.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type Options,
  /**
   * Class form of the same auth definition, for applications using named service classes.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  Service
} from "./internal/auth/auth.ts"
export {
  /**
   * Application configuration. Supply this service to override the ConfigProvider default.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthConfig,
  /**
   * Schema for the shared high-entropy application secret.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthConfiguration
} from "./internal/auth/authConfig.ts"
export {
  /**
   * Invalid auth composition, separate from an authentication failure.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  AuthConfigurationError
} from "./internal/auth/authConfigurationError.ts"
export {
  /**
   * The same validated invocations used by local and transport callers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthMethod,
  /**
   * Pairs a selected, named API with its implementing Layer, preserving every method's types.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeAuthStrategy as makeStrategy
} from "./internal/auth/authStrategy.ts"
export {
  /**
   * Failure indicating that an operation requires an authenticated subject.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  AuthenticationRequired
} from "./internal/operations/errors.ts"

export type {
  /**
   * Extracts the claims and namespaces used to bind a strategy definition.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  BindingOf,
  /**
   * Schema codec for application-specific session claims.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  ClaimsCodec,
  /**
   * Static contracts and service keys shared by one auth definition. Implementations come from Layers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  StrategyBinding,
  /**
   * Authentication strategy definition that binds to shared claims and session services.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  StrategyDefinition,
  /**
   * Type-level mapping from a strategy binding to its concrete implementation.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  StrategyTypeLambda
} from "./internal/auth/definition.ts"

export {
  /**
   * Supplied by the host for one request or native workflow, never a shared auth Layer.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthRequest
} from "./internal/auth/authRequest.ts"
export type {
  /**
   * Session actions share implementations across HTTP, native and local callers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  SessionApi,
  /**
   * Failures returned by session actions and their operation boundaries.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  SessionApiError
} from "./internal/auth/session.ts"
export {
  /**
   * Dedicated request-binding keys, shared by the selected authentication methods.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  RequestBindingConfig
} from "./internal/operations/requestBindingConfig.ts"
