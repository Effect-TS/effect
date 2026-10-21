/**
 * Browser WebAuthn ceremonies backed by SimpleWebAuthn.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Client-local service that discovers browser capabilities and runs passkey registration and
   * authentication ceremonies. The caller owns the corresponding server begin and complete operations
   * and their request binding.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyBrowser
} from "./internal/browser/passkeyBrowser.ts"

export {
  /**
   * Schema for a browser authentication response and the flow identifier of its original server
   * challenge.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBrowserAuthentication,
  /**
   * Failure indicating that this client already has an active passkey ceremony.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyBrowserBusy,
  /**
   * Schema for secure-context and WebAuthn availability, conditional authentication, and
   * platform-authenticator support.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBrowserCapabilities,
  /**
   * Schema for supported, unsupported, or unknown browser passkey capability status.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBrowserCapability,
  /**
   * Schema for rejected input, unsupported capabilities, an active ceremony, cancellation, or
   * unavailable browser behavior.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBrowserFailure,
  /**
   * Failure indicating malformed or unsupported input to a browser passkey ceremony.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyBrowserInputRejected,
  /**
   * Failure indicating that the authenticator ceremony ended without a registration or authentication
   * response.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyBrowserNotCompleted,
  /**
   * Schema for a browser registration response and the flow identifier of its original server challenge.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBrowserRegistration,
  /**
   * Failure indicating that browser passkey capabilities could not be queried or the ceremony could not
   * run.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyBrowserUnavailable,
  /**
   * Failure indicating that the requested passkey ceremony is unsupported in the current browser
   * environment.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyBrowserUnsupported
} from "./internal/browser/models.ts"

export {
  /**
   * Layer that supplies an isolated browser passkey client backed by SimpleWebAuthn.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layerSimpleWebAuthnPasskeyBrowser as layer,
  /**
   * Creates an isolated SimpleWebAuthn browser client for capability discovery and passkey ceremonies.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSimpleWebAuthnPasskeyBrowser as make
} from "./internal/browser/simplewebauthn.ts"
