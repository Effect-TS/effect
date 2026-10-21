/**
 * OAuth callback proxy with encrypted provider state and one-use application handoffs.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Configuration for a proxy-backed OAuth provider.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type Options as ProviderOptions,
  /**
   * Creates a provider that delegates callbacks to an OAuth proxy.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  provider
} from "./internal/oauth/proxy/client.ts"
export {
  /**
   * Builds encryption for callback-server OAuth state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  protectorLayer
} from "./internal/oauth/proxy/protection.ts"
export {
  /**
   * Builds the configured OAuth proxy service.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  layer,
  /**
   * Configuration for the module.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type Options,
  /**
   * Registers OAuth proxy routes with an HTTP router.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  routes,
  /**
   * Service that handles OAuth proxy requests.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Server
} from "./internal/oauth/proxy/server.ts"

export {
  /**
   * Error indicating invalid module configuration.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  ConfigurationError,
  /**
   * Schema and type for encrypted OAuth proxy state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Envelope,
  /**
   * Schema and type for a trusted application environment.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Environment,
  /**
   * Schema and type for callback state bound to its application and provider.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  FlowContext,
  /**
   * Schema and type for protected proxy preparation or verified identity.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Payload,
  /**
   * Service that persists module state and atomic transitions.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Persistence,
  /**
   * Service that seals and opens bound OAuth proxy state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Protector,
  /**
   * Schema and type for durable module state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Record,
  /**
   * Error indicating a rejected OAuth proxy request.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Rejected,
  /**
   * Error indicating unavailable authentication infrastructure.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Unavailable
} from "./internal/oauth/proxy/models.ts"
