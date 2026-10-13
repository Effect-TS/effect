/**
 * Deno layers for Effect's cryptographic services.
 *
 * The `effect/crypto` modules implement most algorithms with Deno's Web Crypto
 * API; this module adds MD5, ChaCha20-Poly1305, and XChaCha20-Poly1305 from
 * Deno's `node:crypto`. Deno does not implement Argon2id, so this module
 * provides no layer for `Argon2.Argon2id`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as Aes from "effect/crypto/Aes"
import type * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Hkdf from "effect/crypto/Hkdf"
import * as Hmac from "effect/crypto/Hmac"
import type * as Md5 from "effect/crypto/Md5"
import * as Pbkdf2 from "effect/crypto/Pbkdf2"
import * as Rsa from "effect/crypto/Rsa"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Sha1 from "effect/crypto/Sha1"
import * as Sha2 from "effect/crypto/Sha2"
import * as Layer from "effect/Layer"

/**
 * Layer that provides `Md5.Md5` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMd5: Layer.Layer<Md5.Md5> = NodeCrypto.layerMd5

/**
 * Layer that provides `ChaCha20Poly1305.ChaCha20Poly1305` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerChaCha20Poly1305: Layer.Layer<ChaCha20Poly1305.ChaCha20Poly1305> = NodeCrypto.layerChaCha20Poly1305

/**
 * Layer that provides `ChaCha20Poly1305.XChaCha20Poly1305` using Deno's `node:crypto`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerXChaCha20Poly1305: Layer.Layer<ChaCha20Poly1305.XChaCha20Poly1305> = NodeCrypto.layerXChaCha20Poly1305

/**
 * Union of the services provided by {@link layer}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type DenoCryptoServices =
  | SecureRandom.SecureRandom
  | Md5.Md5
  | Sha1.Sha1
  | Sha2.Sha2
  | Hmac.Hmac
  | Aes.Aes
  | ChaCha20Poly1305.ChaCha20Poly1305
  | ChaCha20Poly1305.XChaCha20Poly1305
  | Hkdf.Hkdf
  | Pbkdf2.Pbkdf2
  | Ed25519.Ed25519
  | Ecdsa.Ecdsa
  | Rsa.Rsa
  | Ecdh.Ecdh

/**
 * Layer that provides every cryptographic service Deno supports.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<DenoCryptoServices> = Layer.mergeAll(
  Sha1.layer,
  Sha2.layer,
  Hmac.layer,
  Aes.layer,
  Hkdf.layer,
  Pbkdf2.layer,
  Ed25519.layer,
  Ecdsa.layer,
  Rsa.layer,
  Ecdh.layer,
  SecureRandom.layer,
  layerMd5,
  layerChaCha20Poly1305,
  layerXChaCha20Poly1305
).pipe(
  // Deno always provides Web Crypto, so the layers cannot fail.
  Layer.orDie
)
