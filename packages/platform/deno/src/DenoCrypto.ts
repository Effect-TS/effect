/**
 * Deno-backed implementation of Effect's Crypto service.
 *
 * This module uses Deno's global Web Crypto API for secure randomness, SHA
 * digests, HMAC, HKDF, PBKDF2, key management, encryption, and signing. Legacy MD5
 * protocol digests use `node:crypto`. Argon2id and XChaCha20-Poly1305 use the
 * Node-compatible backend and fail with `PlatformError` when Deno omits the
 * corresponding native algorithm.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeCrypto from "@effect/platform-node-shared/NodeCrypto"
import * as Context from "effect/Context"
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import { createHash } from "node:crypto"

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

    const digest: EffectCrypto.Crypto["digest"] = (algorithm, data) => {
      if (algorithm === "MD5") {
        return Effect.try({
          try: () => Uint8Array.from(createHash("md5").update(data).digest()),
          catch: (cause) =>
            PlatformError.systemError({
              module: "Crypto",
              method: "digest",
              _tag: "Unknown",
              description: "Could not compute digest",
              cause
            })
        })
      }
      return Effect.map(
        Effect.tryPromise({
          try: () => crypto.subtle.digest(algorithm, new Uint8Array(data)),
          catch: (cause) =>
            PlatformError.systemError({
              module: "Crypto",
              method: "digest",
              _tag: "Unknown",
              description: "Could not compute digest",
              cause
            })
        }),
        (buffer) => new Uint8Array(buffer)
      )
    }

    return EffectCrypto.make({
      ...EffectCrypto.makeSubtle(crypto.subtle),
      randomBytes,
      argon2id: NodeCrypto.make.argon2id,
      xchacha20poly1305Encrypt: NodeCrypto.make.xchacha20poly1305Encrypt,
      xchacha20poly1305Decrypt: NodeCrypto.make.xchacha20poly1305Decrypt,
      digest
    })
  })
)
