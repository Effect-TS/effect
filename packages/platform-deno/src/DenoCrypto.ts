/**
 * Deno-backed implementation of Effect's Crypto service.
 *
 * This module uses Deno's global Web Crypto API. Unlike the browser
 * implementation, random byte requests are split into chunks of at most 65,536
 * bytes so they support the full size range accepted by `Crypto.make`. Deno's
 * supported runtime versions always provide `globalThis.crypto` and
 * `crypto.subtle`, so this implementation does not include browser availability
 * guards.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as EffectCrypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformError from "effect/PlatformError"

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
        crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + 65_536, bytes.length)))
      }
      return bytes
    }

    const digest: EffectCrypto.Crypto["digest"] = (algorithm, data) =>
      Effect.map(
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

    return EffectCrypto.make({
      randomBytes,
      digest
    })
  })
)
