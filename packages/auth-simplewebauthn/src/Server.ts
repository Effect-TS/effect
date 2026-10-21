/**
 * WebAuthn ceremony preparation and verification backed by SimpleWebAuthn.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for the relying-party profiles available to SimpleWebAuthn ceremony preparation and
   * verification.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SimpleWebAuthnPasskeyProtocolOptions
} from "./internal/server/models.ts"

export {
  /**
   * Layer that supplies passkey ceremony preparation and verification using the configured relying-party
   * profiles.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layerSimpleWebAuthnPasskeyProtocol as layer,
  /**
   * Creates a SimpleWebAuthn implementation that prepares and verifies passkey ceremonies for the
   * supplied profiles.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSimpleWebAuthnPasskeyProtocol as make
} from "./internal/server/protocol.ts"
