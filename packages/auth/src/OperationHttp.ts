/**
 * HTTP routes and credential fields for authentication operations.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * HTTP authentication route without a specific operation, credential mapping, or method type.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyRoute,
  /**
   * Mapping from operation payload fields to private credential slots supplied by the transport.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type CredentialFields,
  /**
   * Operation contract and invocation capabilities required to expose authentication over HTTP.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type HttpOperation,
  /**
   * Creates an HTTP operation contract, rejecting duplicate route paths or operation names.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * HTTP method, path, private credential mapping, and private-output declarations for an operation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OperationHttpRoute,
  /**
   * Creates an HTTP route and declares which operation fields come from private credentials.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  route,
  /**
   * Declared error type returned by an HTTP authentication route.
   *
   * @stability unstable
   * @category utility types types
   * @since 4.1.0
   */
  type RouteFailure,
  /**
   * Encoded route payload with transport-supplied private credential fields omitted.
   *
   * @stability unstable
   * @category utility types types types
   * @since 4.1.0
   */
  type RouteInput,
  /**
   * Services required by route.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type RouteRequirements,
  /**
   * Decoded success type returned by an HTTP authentication route.
   *
   * @stability unstable
   * @category utility types types types
   * @since 4.1.0
   */
  type RouteSuccess
} from "./internal/httpOperation/contract.ts"

export {
  /**
   * Failure indicating invalid HTTP routes, credential transport, or request-security configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OperationHttpConfigurationError,
  /**
   * Failure at the HTTP transport boundary, with a sanitized reason such as origin, credentials,
   * timeout, or response decoding.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OperationHttpError
} from "./internal/httpOperation/errors.ts"
