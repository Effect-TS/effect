/**
 * Browser-backed implementation of Effect's Crypto service.
 *
 * This module provides a `Crypto.Crypto` layer backed by the Web Crypto API.
 * The {@link WebCrypto} context reference defaults to `globalThis.crypto`, so
 * browser programs can use the standard implementation while tests or embedded
 * runtimes can provide their own `Crypto` object.
 *
 * @stability unstable
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Provides Browser Web Crypto APIs used by the Crypto service implementation.
 *
 * **When to use**
 *
 * Use to override the browser `Crypto` object used by the platform crypto
 * layer.
 *
 * @stability unstable
 * @category services
 * @since 1.0.0
 */
export const WebCrypto = Context.Reference<Crypto>("@effect/platform-browser/Crypto/WebCrypto", {
  defaultValue: () => globalThis.crypto
})

/**
 * Layer that directly interfaces with the Web Crypto API.
 *
 * **When to use**
 *
 * Use to provide cryptographic randomness, digests, key management, encryption,
 * and signing in browser runtimes backed by `globalThis.crypto`.
 *
 * **Details**
 *
 * Random bytes are produced with `crypto.getRandomValues`. SHA digests, HMAC,
 * HKDF, PBKDF2, AES-GCM, AES-CTR, RSA-OAEP, RSA-PSS, RSASSA-PKCS1-v1_5, ECDSA,
 * Ed25519, ECDH and X25519 key agreement, and key management use
 * `crypto.subtle`. MD5, Argon2id, and XChaCha20-Poly1305
 * are unsupported and fail with `PlatformError`.
 *
 * **Gotchas**
 *
 * The layer dies if the Web Crypto object is unavailable. Digest operations
 * fail with `PlatformError` when `crypto.subtle.digest` is unavailable or the
 * browser rejects the digest request.
 *
 * @stability unstable
 * @category layers
 * @since 1.0.0
 */
export const layer: Layer.Layer<EffectCrypto.Crypto> = Layer.effect(
  EffectCrypto.Crypto,
  Effect.gen(function*() {
    const crypto = yield* WebCrypto
    if (!crypto) {
      return yield* Effect.die(new Error("Web Crypto API is not available"))
    }
    const randomBytes = (size: number): Uint8Array => {
      const bytes = new Uint8Array(size)
      for (let i = 0; i < bytes.length; i += 65_536) {
        crypto.getRandomValues(bytes.subarray(i, i + 65_536))
      }
      return bytes
    }

    return EffectCrypto.make({ subtle: crypto.subtle, randomBytes })
  })
)
