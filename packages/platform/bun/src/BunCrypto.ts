/**
 * The `BunCrypto` module provides Bun layers for Effect's cryptographic
 * services. The `effect/crypto` modules implement most algorithms with Bun's
 * Web Crypto API; this module adds MD5 from `node:crypto`.
 *
 * Bun does not implement ChaCha20-Poly1305 or Argon2id, so this module
 * provides no layers for `Crypto.ChaCha20Poly1305`, `Crypto.XChaCha20Poly1305`,
 * or `Crypto.Argon2id`.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as Crypto from "effect/Crypto"
import * as Layer from "effect/Layer"

/**
 * Layer that provides `Crypto.Md5` using Bun's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMd5: Layer.Layer<Crypto.Md5> = NodeCrypto.layerMd5

/**
 * Union of the services provided by {@link layer}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type BunCryptoServices =
  | Crypto.SecureRandom
  | Crypto.Md5
  | Crypto.Sha1
  | Crypto.Sha2
  | Crypto.Hmac
  | Crypto.Aes
  | Crypto.Hkdf
  | Crypto.Pbkdf2
  | Crypto.Ed25519
  | Crypto.Ecdsa
  | Crypto.Rsa
  | Crypto.Ecdh

/**
 * Layer that provides every cryptographic service Bun supports.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<BunCryptoServices> = Layer.mergeAll(
  Crypto.layerSha1,
  Crypto.layerSha2,
  Crypto.layerHmac,
  Crypto.layerAes,
  Crypto.layerHkdf,
  Crypto.layerPbkdf2,
  Crypto.layerEd25519,
  Crypto.layerEcdsa,
  Crypto.layerRsa,
  Crypto.layerEcdh,
  Crypto.layerSecureRandom,
  layerMd5
).pipe(
  // Bun always provides Web Crypto, so the layers cannot fail.
  Layer.orDie
)
