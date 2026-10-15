/**
 * HKDF key derivation, as specified in RFC 5869.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Redacted from "../Redacted.ts"
import * as CryptoError from "./CryptoError.ts"
import * as WebCrypto from "./internal/webCrypto.ts"

/**
 * SHA hash algorithms accepted by this module.
 *
 * **Gotchas**
 *
 * SHA-1 is included for interoperability with existing protocols. Do not use
 * it for new security-sensitive designs.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

/**
 * Parameters for HKDF key derivation.
 *
 * **Details**
 *
 * `length` is measured in bytes and must be between 1 and 255 times the hash
 * output size. Salt and info default to empty.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly hash: HashAlgorithm
  readonly key: Redacted.Redacted<Uint8Array>
  readonly salt?: Uint8Array | undefined
  readonly info?: Uint8Array | undefined
  readonly length: number
}

/**
 * Service for RFC 5869 HKDF key derivation.
 *
 * **Example** (Deriving a session key from a shared secret)
 *
 * ```ts import.meta.vitest
 * import { Effect, Redacted } from "effect"
 * import { Hkdf } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const hkdf = yield* Hkdf.Hkdf
 *   return yield* hkdf.derive({
 *     hash: "SHA-256",
 *     key: Redacted.make(new Uint8Array(32).fill(7)),
 *     info: new TextEncoder().encode("session"),
 *     length: 32
 *   })
 * })
 *
 * const key = await Effect.runPromise(program.pipe(Effect.provide(Hkdf.layer)))
 * Redacted.value(key).length // => 32
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Hkdf extends Context.Service<Hkdf, {
  /**
   * Derives secret bytes with HKDF. Lengths outside 1 to 255 times the hash
   * output size fail with an `InvalidArgument` reason.
   */
  readonly derive: (options: Options) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
}>()("effect/crypto/Hkdf") {}

// Output sizes in bytes.
const hashLengths: Record<HashAlgorithm, number> = {
  "SHA-1": 20,
  "SHA-256": 32,
  "SHA-384": 48,
  "SHA-512": 64
}

/**
 * Layer that provides `Hkdf` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Hkdf, CryptoError.CryptoError> = Layer.effect(
  Hkdf,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    return {
      derive: (options) => {
        // Web Crypto takes a 32-bit bit length, and some backends wrap larger
        // values instead of rejecting them.
        const maxLength = 255 * (hashLengths[options.hash] ?? 0)
        if (!Number.isSafeInteger(options.length) || options.length < 1 || options.length > maxLength) {
          return Effect.fail(
            new CryptoError.CryptoError({
              module: "HKDF",
              method: "derive",
              reason: new CryptoError.InvalidArgument({
                description: "length must be between 1 and 255 times the hash output size"
              })
            })
          )
        }
        const params: HkdfParams = {
          name: "HKDF",
          hash: options.hash,
          salt: (options.salt ?? new Uint8Array()) as BufferSource,
          info: (options.info ?? new Uint8Array()) as BufferSource
        }
        return Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("raw", Redacted.value(options.key) as BufferSource, "HKDF", false, [
              "deriveBits"
            ])
            return Redacted.make(new Uint8Array(await subtle.deriveBits(params, handle, options.length * 8)))
          },
          catch: (cause) => WebCrypto.webCryptoError("HKDF", "derive", cause)
        })
      }
    }
  })
)
