/**
 * Node.js layers for the `effect/crypto` modules.
 *
 * `layerDigest` and `layerMac` run on `node:crypto`, `layerKdf` adds Argon2id,
 * and `layerSecureRandom` is the core WebCrypto layer, re-exported so that
 * every crypto layer for a Node.js program comes from `NodeCrypto`. There is no bundled layer, and
 * `NodeServices` carries no crypto service.
 *
 * @stability unstable
 * @since 1.0.0
 */

/**
 * @stability unstable
 * @since 1.0.0
 */
export * from "@effect/platform-node-shared/NodeCrypto"
