/**
 * SHA-256, SHA-384, and SHA-512 digests.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as CryptoError from "./CryptoError.ts"
import * as WebCrypto from "./WebCrypto.ts"

/**
 * SHA-2 digest variants provided by the `Sha2` service.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Algorithm = "SHA-256" | "SHA-384" | "SHA-512"

/**
 * Service that computes SHA-256, SHA-384, and SHA-512 digests.
 *
 * **Example** (Hashing with SHA-256)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Sha2 } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const sha2 = yield* Sha2.Sha2
 *   return yield* sha2.digest("SHA-256", new TextEncoder().encode("abc"))
 * })
 *
 * const digest = await Effect.runPromise(program.pipe(Effect.provide(Sha2.layer)))
 * digest.length // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Sha2 extends Context.Service<Sha2, {
  /**
   * Computes a SHA-2 digest of the supplied data.
   */
  readonly digest: (algorithm: Algorithm, data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Sha2") {}

/**
 * Layer that provides `Sha2` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Sha2, CryptoError.CryptoError> = Layer.effect(
  Sha2,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtleCrypto
    return {
      digest: (algorithm, data) =>
        Effect.tryPromise({
          try: async () => new Uint8Array(await subtle.digest(algorithm, data as BufferSource)),
          catch: (cause) => WebCrypto.webCryptoError(algorithm, "digest", cause)
        })
    }
  })
)
