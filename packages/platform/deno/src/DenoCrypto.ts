/**
 * Deno layers for Effect's cryptographic services.
 *
 * The `effect/crypto` modules implement most algorithms with Deno's Web Crypto
 * API; this module adds MD5, ChaCha20-Poly1305, and XChaCha20-Poly1305 from
 * Deno's `node:crypto`. Deno does not implement Argon2id, so this module
 * provides no layer for `Crypto.Argon2id`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as Crypto from "effect/Crypto"
import * as Layer from "effect/Layer"

/**
 * Layer that provides `Crypto.Md5` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMd5: Layer.Layer<Crypto.Md5> = NodeCrypto.layerMd5

/**
 * Layer that provides `Crypto.ChaCha20Poly1305` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerChaCha20Poly1305: Layer.Layer<Crypto.ChaCha20Poly1305> = NodeCrypto.layerChaCha20Poly1305

/**
 * Layer that provides `Crypto.XChaCha20Poly1305` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerXChaCha20Poly1305: Layer.Layer<Crypto.XChaCha20Poly1305> = NodeCrypto.layerXChaCha20Poly1305

/**
 * Union of the services provided by {@link layer}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type DenoCryptoServices =
  | Crypto.SecureRandom
  | Crypto.Md5
  | Crypto.Sha1
  | Crypto.Sha2
  | Crypto.Hmac
  | Crypto.Aes
  | Crypto.ChaCha20Poly1305
  | Crypto.XChaCha20Poly1305
  | Crypto.Hkdf
  | Crypto.Pbkdf2
  | Crypto.Ed25519
  | Crypto.Ecdsa
  | Crypto.Rsa
  | Crypto.Ecdh

/**
 * Layer that provides every cryptographic service Deno supports.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<DenoCryptoServices> = Layer.mergeAll(
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
  layerMd5,
  layerChaCha20Poly1305,
  layerXChaCha20Poly1305
).pipe(
  // Deno always provides Web Crypto, so the layers cannot fail.
  Layer.orDie
)
