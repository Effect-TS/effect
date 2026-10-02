/**
 * Deno-backed implementation of Effect's Crypto service.
 *
 * This module uses Deno's global Web Crypto API for secure randomness, SHA
 * digests, HMAC, and PBKDF2. Legacy MD5 protocol digests use `node:crypto`.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"
import { createHash } from "node:crypto"

/**
 * Provides the Web Crypto API used by the Crypto service implementation.
 *
 * @category services
 * @since 4.0.0
 */
export const WebCrypto = Context.Reference<Crypto>("@effect/platform-deno/Crypto/WebCrypto", {
  defaultValue: () => globalThis.crypto
})

/**
 * A layer that provides Effect's Crypto service using Deno's Web Crypto API.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<EffectCrypto.Crypto> = Layer.effect(
  EffectCrypto.Crypto,
  Effect.gen(function*() {
    const crypto = yield* WebCrypto
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
      randomBytes,
      digest,
      hmac: (algorithm, key, data) =>
        Effect.map(
          Effect.tryPromise({
            try: async () => {
              const ownedKey = new Uint8Array(key)
              const ownedData = new Uint8Array(data)
              const cryptoKey = await crypto.subtle.importKey(
                "raw",
                ownedKey,
                { name: "HMAC", hash: algorithm },
                false,
                ["sign"]
              )
              return crypto.subtle.sign("HMAC", cryptoKey, ownedData)
            },
            catch: (cause) =>
              PlatformError.systemError({
                module: "Crypto",
                method: "hmac",
                _tag: "Unknown",
                description: "Could not compute HMAC",
                cause
              })
          }),
          (buffer) => new Uint8Array(buffer)
        ),
      pbkdf2: (algorithm, password, salt, iterations, length) =>
        Effect.map(
          Effect.tryPromise({
            try: async () => {
              const ownedPassword = new Uint8Array(password)
              const ownedSalt = new Uint8Array(salt)
              const cryptoKey = await crypto.subtle.importKey("raw", ownedPassword, "PBKDF2", false, ["deriveBits"])
              return crypto.subtle.deriveBits(
                { name: "PBKDF2", hash: algorithm, salt: ownedSalt, iterations },
                cryptoKey,
                length * 8
              )
            },
            catch: (cause) =>
              PlatformError.systemError({
                module: "Crypto",
                method: "pbkdf2",
                _tag: "Unknown",
                description: "Could not derive password key",
                cause
              })
          }),
          (buffer) => new Uint8Array(buffer)
        )
    })
  })
)
