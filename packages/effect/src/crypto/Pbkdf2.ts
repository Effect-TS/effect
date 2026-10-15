/**
 * PBKDF2 password hashing and key derivation.
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
 * Parameters for PBKDF2 password derivation.
 *
 * **Details**
 *
 * Iterations must be between 1 and 2^31 - 1. `length` is measured in bytes
 * and must be between 1 and 2^29 - 1.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly hash: HashAlgorithm
  readonly password: Redacted.Redacted<Uint8Array>
  readonly salt: Uint8Array
  readonly iterations: number
  readonly length: number
}

/**
 * Service for PBKDF2 password hashing.
 *
 * **Details**
 *
 * Passwords and derived bytes are `Redacted`, so a derived key can be passed
 * directly to services such as `Aes`. Store `Redacted.value` of a derived
 * password hash and check passwords against it with `verify`.
 *
 * **Gotchas**
 *
 * Interruption stops waiting for the result; native derivation may continue.
 * Prefer `Argon2id` where available, since PBKDF2 is not memory-hard.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Pbkdf2 extends Context.Service<Pbkdf2, {
  /**
   * Derives a password hash with PBKDF2. Iterations outside 1 to 2^31 - 1 and
   * lengths outside 1 to 2^29 - 1 bytes fail with an `InvalidArgument` reason.
   */
  readonly derive: (options: Options) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
  /**
   * Checks a password against a stored PBKDF2 hash by deriving
   * `expected.length` bytes and comparing them in constant time. A stored
   * hash whose length is not a valid output length never matches.
   */
  readonly verify: (
    options: Omit<Options, "length"> & { readonly expected: Uint8Array }
  ) => Effect.Effect<boolean, CryptoError.CryptoError>
}>()("effect/crypto/Pbkdf2") {}

/**
 * Layer that provides `Pbkdf2` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Pbkdf2, CryptoError.CryptoError> = Layer.effect(
  Pbkdf2,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    // Web Crypto takes a 32-bit bit length, and some backends wrap larger
    // values instead of rejecting them. Node.js aborts the process on
    // iteration counts above 2^31 - 1.
    const validIterations = (iterations: number) =>
      Number.isSafeInteger(iterations) && iterations >= 1 && iterations <= 0x7fff_ffff
    const validLength = (length: number) => length >= 1 && length <= 0x1fff_ffff
    const derive = (method: string, options: Options) => {
      const { iterations, length } = options
      if (!validIterations(iterations) || !Number.isSafeInteger(length) || !validLength(length)) {
        return Effect.fail(
          new CryptoError.CryptoError({
            module: "PBKDF2",
            method: method,
            reason: new CryptoError.InvalidArgument({
              description: "iterations must be between 1 and 2^31 - 1 and length between 1 and 2^29 - 1"
            })
          })
        )
      }
      const params: Pbkdf2Params = {
        name: "PBKDF2",
        hash: options.hash,
        salt: options.salt as BufferSource,
        iterations
      }
      return Effect.tryPromise({
        try: async () => {
          const handle = await subtle.importKey(
            "raw",
            Redacted.value(options.password) as BufferSource,
            "PBKDF2",
            false,
            [
              "deriveBits"
            ]
          )
          return new Uint8Array(await subtle.deriveBits(params, handle, length * 8))
        },
        catch: (cause) => WebCrypto.webCryptoError("PBKDF2", method, cause)
      })
    }
    return {
      derive: (options) => Effect.map(derive("derive", options), (bytes) => Redacted.make(bytes)),
      verify: ({ expected, ...options }) => {
        if (validIterations(options.iterations) && !validLength(expected.length)) return Effect.succeed(false)
        return Effect.map(derive("verify", { ...options, length: expected.length }), (actual) => {
          // Accumulate every difference so the comparison takes constant time.
          let difference = actual.length ^ expected.length
          for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i]
          actual.fill(0)
          return difference === 0
        })
      }
    }
  })
)
