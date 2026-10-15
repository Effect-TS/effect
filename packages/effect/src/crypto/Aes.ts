/**
 * AES encryption: AES-GCM authenticated encryption and unauthenticated
 * AES-CTR.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Redacted from "../Redacted.ts"
import type * as Aead from "./Aead.ts"
import * as CryptoError from "./CryptoError.ts"
import * as WebCrypto from "./internal/webCrypto.ts"

/**
 * Inputs for AES-CTR encryption and decryption.
 *
 * **Details**
 *
 * `counter` is the 16-byte initial counter block. Its low `counterLength`
 * bits, between 1 and 128, increment big-endian once per 16-byte block. Each
 * call starts from the supplied counter and may span at most
 * `2^counterLength` blocks. Counters, counter lengths, and data lengths that
 * Web Crypto rejects fail with an `InvalidArgument` reason.
 *
 * **Gotchas**
 *
 * Never reuse a counter block with the same key. Some backends, such as Deno,
 * accept only 32-, 64-, or 128-bit counter lengths.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CtrOptions {
  readonly key: Redacted.Redacted<Uint8Array>
  readonly counter: Uint8Array
  readonly counterLength: number
  readonly data: Uint8Array
}

/**
 * Service for AES encryption: AES-GCM authenticated encryption and
 * unauthenticated AES-CTR.
 *
 * **Details**
 *
 * Keys are 16, 24, or 32 `Redacted` bytes; other lengths fail with an
 * `InvalidKey` reason. AES-GCM takes 12-byte nonces, failing with a
 * `InvalidArgument` reason for other lengths, and appends a 16-byte tag;
 * decryption fails with a `DecryptionFailed` reason when the tag does not
 * match. AES-CTR output has the length of its input.
 *
 * **Gotchas**
 *
 * AES-CTR output is malleable: authenticate it with `Mac`, or prefer
 * AES-GCM. It exists for protocols such as SSH that pair it with a MAC.
 * Chromium-based browsers do not support 24-byte keys.
 *
 * **Example** (Encrypting with AES-GCM)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Aes } from "effect/crypto"
 *
 * const program = Effect.gen(function*() {
 *   const aes = yield* Aes.Aes
 *   const key = yield* aes.generateKey()
 *   const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12))
 *   const ciphertext = yield* aes.encryptGcm({ key, nonce, data: new TextEncoder().encode("secret") })
 *   const plaintext = yield* aes.decryptGcm({ key, nonce, data: ciphertext })
 *   return [ciphertext.length, new TextDecoder().decode(plaintext)]
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Aes.layer))) // => [22, "secret"]
 * ```
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Aes extends Context.Service<Aes, {
  /**
   * Generates a random key.
   */
  readonly generateKey: (options?: {
    /**
     * Key length in bits.
     *
     * @default 256
     */
    readonly length?: 128 | 192 | 256 | undefined
  }) => Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError>
  /**
   * Encrypts with AES-GCM and appends the authentication tag.
   */
  readonly encryptGcm: (options: Aead.Options) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Authenticates and decrypts AES-GCM ciphertext.
   */
  readonly decryptGcm: (options: Aead.Options) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Encrypts with AES-CTR.
   */
  readonly encryptCtr: (options: CtrOptions) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
  /**
   * Decrypts AES-CTR ciphertext.
   */
  readonly decryptCtr: (options: CtrOptions) => Effect.Effect<Uint8Array, CryptoError.CryptoError>
}>()("effect/crypto/Aes") {}

// The JOSE `alg` values of the keys the `Aes` service uses, mapped to the
// algorithm Web Crypto checks them and the key length against.
const jwkAlgorithm = (alg: string | undefined): "AES-GCM" | "AES-CTR" | undefined => {
  switch (alg) {
    case undefined:
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      return "AES-GCM"
    case "A128CTR":
    case "A192CTR":
    case "A256CTR":
      return "AES-CTR"
    default:
      return undefined
  }
}

/**
 * Reads an AES key from an `oct` JSON Web Key.
 *
 * **Details**
 *
 * When the key has an `alg`, it must be an AES-GCM or AES-CTR algorithm that
 * matches the key length, such as `A256GCM`. Keys for other algorithms, such
 * as `HS256` or `A256KW`, fail with an `InvalidKey` reason. `use` and
 * `key_ops` are not checked.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const keyFromJwk = (jwk: JsonWebKey): Effect.Effect<Redacted.Redacted<Uint8Array>, CryptoError.CryptoError> => {
  const name = jwkAlgorithm(jwk.alg)
  if (name === undefined) {
    return Effect.fail(
      new CryptoError.CryptoError({
        module: "AES",
        method: "keyFromJwk",
        reason: new CryptoError.InvalidKey({ description: `Expected an AES-GCM or AES-CTR key, not ${jwk.alg}` })
      })
    )
  }
  return Effect.flatMap(WebCrypto.subtle, (subtle) =>
    Effect.tryPromise({
      try: async () => {
        // Web Crypto would check these JOSE members against the import parameters.
        const { use, key_ops, ext, ...material } = jwk
        const handle = await subtle.importKey("jwk", material, name, true, ["encrypt"])
        return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
      },
      catch: (cause) => WebCrypto.webCryptoError("AES", "keyFromJwk", cause)
    }))
}

/**
 * Layer that provides `Aes` using the Web Crypto API.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Aes, CryptoError.CryptoError> = Layer.effect(
  Aes,
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtle
    // Keys are imported separately, so an `OperationError` from the import,
    // such as Chrome's rejection of 192-bit keys, is not mistaken for one from
    // the operation.
    const importKey = (
      name: "AES-GCM" | "AES-CTR",
      method: string,
      key: Redacted.Redacted<Uint8Array>,
      usage: "encrypt" | "decrypt"
    ) =>
      Effect.tryPromise({
        try: () => subtle.importKey("raw", Redacted.value(key) as BufferSource, name, false, [usage]),
        catch: (cause) => WebCrypto.webCryptoError(name, method, cause)
      })
    const gcm =
      (usage: "encrypt" | "decrypt", method: "encryptGcm" | "decryptGcm") =>
      ({ additionalData, data, key, nonce }: Aead.Options) => {
        // Web Crypto reports other lengths with the `OperationError` that also
        // signals a tag mismatch.
        if (nonce.length !== 12) {
          return Effect.fail(
            new CryptoError.CryptoError({
              module: "AES-GCM",
              method,
              reason: new CryptoError.InvalidArgument({ description: "AES-GCM nonces must contain exactly 12 bytes" })
            })
          )
        }
        const params: AesGcmParams = {
          name: "AES-GCM",
          iv: nonce as BufferSource,
          tagLength: 128,
          ...(additionalData === undefined ? {} : { additionalData: additionalData as BufferSource })
        }
        return Effect.flatMap(importKey("AES-GCM", method, key, usage), (handle) =>
          Effect.tryPromise({
            try: async () => new Uint8Array(await subtle[usage](params, handle, data as BufferSource)),
            catch: (cause) =>
              usage === "decrypt" && WebCrypto.isOperationError(cause)
                ? new CryptoError.CryptoError({
                  module: "AES-GCM",
                  method,
                  reason: new CryptoError.DecryptionFailed()
                })
                : WebCrypto.webCryptoError("AES-GCM", method, cause)
          }))
      }
    const ctr =
      (usage: "encrypt" | "decrypt", method: "encryptCtr" | "decryptCtr") =>
      ({ counter, counterLength, data, key }: CtrOptions) => {
        const params: AesCtrParams = { name: "AES-CTR", counter: counter as BufferSource, length: counterLength }
        return Effect.flatMap(importKey("AES-CTR", method, key, usage), (handle) =>
          Effect.tryPromise({
            try: async () => new Uint8Array(await subtle[usage](params, handle, data as BufferSource)),
            // AES-CTR has no authentication, so an `OperationError` means the
            // counter, counter length, or data length was rejected.
            catch: (cause) =>
              WebCrypto.isOperationError(cause)
                ? new CryptoError.CryptoError({
                  module: "AES-CTR",
                  method,
                  reason: new CryptoError.InvalidArgument({
                    description: "Invalid counter, counter length, or data length",
                    cause
                  })
                })
                : WebCrypto.webCryptoError("AES-CTR", method, cause)
          }))
      }
    return {
      generateKey: (options) =>
        Effect.tryPromise({
          try: async () => {
            const handle = await subtle.generateKey({ name: "AES-GCM", length: options?.length ?? 256 }, true, [
              "encrypt"
            ])
            return Redacted.make(new Uint8Array(await subtle.exportKey("raw", handle)))
          },
          catch: (cause) => WebCrypto.webCryptoError("AES", "generateKey", cause)
        }),
      encryptGcm: gcm("encrypt", "encryptGcm"),
      decryptGcm: gcm("decrypt", "decryptGcm"),
      encryptCtr: ctr("encrypt", "encryptCtr"),
      decryptCtr: ctr("decrypt", "decryptCtr")
    }
  })
)
