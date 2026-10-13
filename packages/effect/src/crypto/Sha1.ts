/**
 * SHA-1 digests, for interoperability with existing protocols.
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
 * Service that computes SHA-1 digests.
 *
 * **Gotchas**
 *
 * SHA-1 is not collision resistant. Use it only for interoperability with
 * existing protocols.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Sha1 extends Context.Service<Sha1, {
  /**
   * Computes a SHA-1 digest of the supplied data.
   */
  readonly digest: (data: Uint8Array) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Sha1") {}

/**
 * Layer that provides `Sha1` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Sha1, CryptoError.CryptoError> = Layer.effect(
  Sha1,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtleCrypto
    return {
      digest: (data) =>
        Effect.tryPromise({
          try: async () => new Uint8Array(await subtle.digest("SHA-1", data as BufferSource)),
          catch: (cause) => WebCrypto.webCryptoError("SHA-1", "digest", cause)
        })
    }
  })
)
