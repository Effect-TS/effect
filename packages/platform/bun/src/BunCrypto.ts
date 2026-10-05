/**
 * The `BunCrypto` module provides Bun's `Crypto` service layer for Effect
 * programs. Provide {@link layer} at the edge of a Bun app, CLI, script, or
 * test to satisfy `effect/Crypto` with cryptographically secure random bytes,
 * UUID generation, random values, digests, HMAC, PBKDF2, key management, encryption, and signing.
 *
 * This adapter reuses the shared Node-compatible implementation, so randomness
 * and cryptographic operations follow Bun's `node:crypto` compatibility layer.
 * MD5 and SHA-1 support interoperability with existing protocols; use stronger
 * algorithms for new security-sensitive designs.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import type * as Crypto from "effect/Crypto"
import type * as Layer from "effect/Layer"

/**
 * Layer that provides the Bun Crypto service implementation.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<Crypto.Crypto> = NodeCrypto.layer
