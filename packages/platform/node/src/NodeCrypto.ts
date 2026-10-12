/**
 * The `NodeCrypto` module provides Node.js layers for Effect's cryptographic
 * services. The `effect/Crypto` module implements most algorithms with Web
 * Crypto; this module runs them on `node:crypto`, so they also work on Node.js
 * 18, which has no `globalThis.crypto`, and adds MD5, ChaCha20-Poly1305,
 * XChaCha20-Poly1305, and Argon2id.
 *
 * Provide {@link layer} for every service except Argon2id. `layerArgon2id`
 * fails to build on Node.js versions without native Argon2id.
 *
 * @stability unstable
 * @since 1.0.0
 */

/**
 * @stability unstable
 * @since 1.0.0
 */
export * from "@effect/platform-node-shared/NodeCrypto"
