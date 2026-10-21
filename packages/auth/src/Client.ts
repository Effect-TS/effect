/**
 * Scoped authentication clients, native credential storage, and private outputs.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Call arguments required by an authentication action’s public input.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type ActionArguments,
  /**
   * Services needed to decode an authentication action’s input or output.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type ActionDecodeServices,
  /**
   * Named calls return Effects; request credentials and private reveals remain in the configured
   * transport capabilities, outside operation results.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthClient,
  /**
   * Yieldable client service together with its action contract and scoped construction effects.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ClientDefinition,
  /**
   * Transport, credential storage, request limits, and CSRF settings for an authentication client.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type ClientOptions,
  /**
   * Identifier for a configured client service, separate from the server service.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ClientService,
  /**
   * Defines a yieldable client without acquiring resources. Provide its layer once in the application
   * Scope, or yield its make Effect for direct acquisition. Supply a non-retrying HttpClient at either
   * boundary. Every instance owns its credential settlement and scoped Atom subscriptions.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  make
} from "./internal/httpOperation/authClient.ts"

export type {
  /**
   * Native credential storage, separate from HTTP header configuration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  NativeCredentials,
  /**
   * Client-owned finite reveal storage. Its Layer owns allocation and disposal.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  PrivateOutput
} from "./internal/httpOperation/client.ts"
