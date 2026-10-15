/**
 * Bun layers for the `effect/crypto` modules.
 *
 * This module re-exports `NodeCrypto` from the shared Node.js package, so Bun
 * programs take every crypto layer from one place: `layerDigest` runs MD5 and
 * SHA on `node:crypto`, and `layerSecureRandom` is the core WebCrypto layer.
 *
 * **Gotchas**
 *
 * Bun's `node:crypto` lacks ChaCha20-Poly1305 and Argon2id, so
 * `layerChaCha20Poly1305`, `layerXChaCha20Poly1305`, and `layerArgon2id` do
 * not work on Bun.
 *
 * @stability unstable
 * @since 1.0.0
 */

/**
 * @stability unstable
 * @since 1.0.0
 */
export * from "@effect/platform-node-shared/NodeCrypto"
