/**
 * Deno-backed implementation of Effect's Crypto service.
 *
 * This module uses Deno's global Web Crypto API for secure randomness, HMAC,
 * HKDF, PBKDF2, key management, encryption, signing, and key agreement.
 * Digests, including legacy MD5, use `node:crypto`. Argon2id and
 * XChaCha20-Poly1305 use the Node-compatible backend and fail with
 * `PlatformError` when Deno omits the corresponding native algorithm.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as Context from "effect/Context"
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Provides the Web Crypto API used by the Crypto service implementation.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const WebCrypto = Context.Reference<Crypto>("@effect/platform-deno/Crypto/WebCrypto", {
  defaultValue: () => globalThis.crypto
})

/**
 * A layer that provides Effect's Crypto service using Deno's Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
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
      for (let offset = 0; offset < bytes.length; offset += 65_536) {
        crypto.getRandomValues(bytes.subarray(offset, offset + 65_536))
      }
      return bytes
    }
    return EffectCrypto.make({
      subtle: crypto.subtle,
      randomBytes,
      digest: NodeCrypto.make.digest,
      argon2id: NodeCrypto.make.argon2id,
      xchacha20poly1305Encrypt: NodeCrypto.make.xchacha20poly1305Encrypt,
      xchacha20poly1305Decrypt: NodeCrypto.make.xchacha20poly1305Decrypt
    })
  })
)
