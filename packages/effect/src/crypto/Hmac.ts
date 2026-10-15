/**
 * HMAC message authentication with SHA-1 or SHA-2.
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
 * Service that computes and verifies HMAC tags.
 *
 * **Details**
 *
 * Keys are `Redacted` bytes and are not bound to a hash; each operation names
 * the hash it uses. Empty keys fail with an `InvalidKey` reason.
 *
 * **Gotchas**
 *
 * Comparing a computed tag with `===` or an early-exit loop can leak timing.
 * Use `verify` to check a received tag. SHA-1 is available for legacy
 * protocols.
 *
 * **Example** (Verifying a webhook signature)
 *
 * ```ts import.meta.vitest
 * import { Effect, Redacted } from "effect"
 * import { Hmac } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const hmac = yield* Hmac.Hmac
 *   const key = Redacted.make(new TextEncoder().encode("webhook secret"))
 *   const data = new TextEncoder().encode("{\"event\":\"paid\"}")
 *   const tag = yield* hmac.compute({ hash: "SHA-256", key, data })
 *   return yield* hmac.verify({ hash: "SHA-256", key, tag, data })
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Hmac.layer))) // => true
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Hmac extends Context.Service<Hmac, {
  /**
   * Generates a random key of the hash's block size.
   */
  readonly generateKey: (options: {
    readonly hash: HashAlgorithm
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
  /**
   * Computes the HMAC tag of the supplied data.
   */
  readonly compute: (options: {
    readonly hash: HashAlgorithm
    readonly key: Redacted.Redacted<Uint8Array>
    readonly data: Uint8Array
  }) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Checks a received tag in constant time. Returns `true` when `tag` equals
   * the HMAC of `data`; truncated tags return `false`.
   */
  readonly verify: (options: {
    readonly hash: HashAlgorithm
    readonly key: Redacted.Redacted<Uint8Array>
    readonly tag: Uint8Array
    readonly data: Uint8Array
  }) => Effect.Effect<boolean, CryptoError.CryptoError>
}>()("effect/crypto/Hmac") {}

// The JOSE `alg` values of HMAC keys, mapped to the hash Web Crypto checks
// them against. `HS1` is the name Web Crypto gives HMAC with SHA-1.
const jwkHash = (alg: string | undefined): HashAlgorithm | undefined => {
  switch (alg) {
    case undefined:
    case "HS256":
      return "SHA-256"
    case "HS1":
      return "SHA-1"
    case "HS384":
      return "SHA-384"
    case "HS512":
      return "SHA-512"
    default:
      return undefined
  }
}

/**
 * Reads an HMAC key from an `oct` JSON Web Key.
 *
 * **Details**
 *
 * When the key has an `alg`, it must be an HMAC algorithm such as `HS256`.
 * Keys for other algorithms, such as `A256GCM`, fail with an `InvalidKey`
 * reason. The key is not bound to that hash. `use` and `key_ops` are not
 * checked.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const keyFromJwk = (jwk: JsonWebKey): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError> => {
  const hash = jwkHash(jwk.alg)
  if (hash === undefined) {
    return Effect.fail(
      new CryptoError.CryptoError({
        module: "HMAC",
        method: "keyFromJwk",
        reason: new CryptoError.InvalidKey({ description: `Expected an HMAC key, not ${jwk.alg}` })
      })
    )
  }
  return Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto would check these JOSE members against the import parameters.
        const { use, key_ops, ext, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, { name: "HMAC", hash }, true, ["sign"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
      },
      catch: (cause) => WebCrypto.webCryptoError("HMAC", "keyFromJwk", cause)
    }))
}

/**
 * Layer that provides `Hmac` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Hmac, CryptoError.CryptoError> = Layer.effect(
  Hmac,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    const params = (hash: HashAlgorithm): HmacImportParams => ({ name: "HMAC", hash })
    return {
      generateKey: ({ hash }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.generateKey(params(hash), true, ["sign"])
            return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
          },
          catch: (cause) => WebCrypto.webCryptoError("HMAC", "generateKey", cause)
        }),
      compute: ({ data, hash, key }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("raw", Redacted.value(key) as BufferSource, params(hash), false, [
              "sign"
            ])
            return new Uint8Array(await subtle.sign("HMAC", handle, data as BufferSource))
          },
          catch: (cause) => WebCrypto.webCryptoError("HMAC", "compute", cause)
        }),
      verify: ({ data, hash, key, tag }) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.importKey("raw", Redacted.value(key) as BufferSource, params(hash), false, [
              "verify"
            ])
            // Web Crypto compares HMAC tags in constant time and rejects other lengths.
            return await subtle.verify("HMAC", handle, tag as BufferSource, data as BufferSource)
          },
          catch: (cause) => WebCrypto.webCryptoError("HMAC", "verify", cause)
        })
    }
  })
)
