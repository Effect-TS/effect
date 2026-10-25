/**
 * Compact JSON Web Encryption with a shared key: `dir` key management and
 * A256GCM content encryption.
 *
 * The protected header is authenticated as additional data, so changing it
 * fails decryption. Headers with `crit` or `zip` are rejected.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Aead from "../crypto/Aead.ts"
import * as SecureRandom from "../crypto/SecureRandom.ts"
import * as Effect from "../Effect.ts"
import * as Base64Url from "../encoding/Base64Url.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import {
  cryptoFailure,
  decodeHeader,
  decodeSegment,
  encodeHeader,
  invalidToken,
  split,
  utf8
} from "./internal/compact.ts"
import * as JoseError from "./JoseError.ts"
import type { SecretKey } from "./Jwk.ts"

/**
 * Schema for a JWE protected header. Other parameters are dropped.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const ProtectedHeader = Schema.Struct({
  alg: Schema.Literal("dir"),
  enc: Schema.Literal("A256GCM"),
  kid: Schema.optionalKey(Schema.String),
  typ: Schema.optionalKey(Schema.String),
  cty: Schema.optionalKey(Schema.String)
})

/**
 * A JWE protected header. It is authenticated only after decryption succeeds.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type ProtectedHeader = typeof ProtectedHeader.Type

/**
 * Header parameters to protect. `alg` and `enc` are fixed and `kid` defaults
 * to the key's.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Header {
  readonly kid?: string | undefined
  readonly typ?: string | undefined
  readonly cty?: string | undefined
}

/**
 * Resolves a decryption key from a parsed, unauthenticated protected header.
 *
 * **Gotchas**
 *
 * Use the header only to select a key. Its contents are authenticated only
 * after decryption succeeds.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type KeyResolver<E = never, R = never> = (
  header: ProtectedHeader
) => Effect.Effect<SecretKey<"dir">, E, R>

/**
 * The protected header and plaintext of a decrypted JWE.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Decrypted {
  readonly protectedHeader: ProtectedHeader
  readonly plaintext: Uint8Array
}

const tagLength = 16

/**
 * Encrypts plaintext as a compact JWE with a random 96-bit IV.
 *
 * **Example** (Encrypting and decrypting a message)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Redacted } from "effect"
 * import { Aead, SecureRandom } from "effect/crypto"
 * import { Jwe, Jwk } from "effect/jose"
 *
 * const layer = Aead.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
 *
 * const plaintext = await Effect.runPromise(Effect.gen(function*() {
 *   // Fixed public example material; generate application secrets securely.
 *   const key = yield* Jwk.importSecret(
 *     Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" } as const),
 *     "dir"
 *   )
 *   const token = yield* Jwe.encrypt(new TextEncoder().encode("private message"), key)
 *   const decrypted = yield* Jwe.decrypt(token, key)
 *   return new TextDecoder().decode(decrypted.plaintext)
 * }).pipe(Effect.provide(layer)))
 * plaintext // => "private message"
 * ```
 *
 * @see {@link decrypt}
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const encrypt = Effect.fnUntraced(function*(
  plaintext: Uint8Array,
  key: SecretKey<"dir">,
  header?: Header
): Effect.fn.Return<Redacted.Redacted<string>, JoseError.JoseError, Aead.Aead | SecureRandom.SecureRandom> {
  const protectedHeader = encodeHeader({ alg: "dir", enc: "A256GCM" }, key.kid, header)
  const random = yield* SecureRandom.SecureRandom
  const nonce = yield* random.randomBytes(Aead.aes256Gcm.nonceLength)
  const aead = yield* Aead.Aead
  const sealed = yield* aead.encrypt(key.key, plaintext, { nonce, aad: utf8(protectedHeader) }).pipe(
    Effect.mapError(cryptoFailure("Could not encrypt with the key"))
  )
  const ciphertext = Base64Url.encode(sealed.subarray(0, -tagLength))
  const tag = Base64Url.encode(sealed.subarray(-tagLength))
  return Redacted.make(`${protectedHeader}..${Base64Url.encode(nonce)}.${ciphertext}.${tag}`)
})

/**
 * Decrypts a compact `dir`/A256GCM JWE and authenticates its protected
 * header.
 *
 * **Details**
 *
 * Accepts a key or an effectful resolver for key rotation. The token's
 * structure and supported header parameters are checked before the resolver
 * runs. Resolver failures and service requirements are preserved.
 *
 * **Gotchas**
 *
 * The resolver receives an unauthenticated header and must use it only for
 * key selection.
 *
 * @see {@link encrypt}
 * @see {@link KeyResolver}
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const decrypt = Effect.fnUntraced(function*<E = never, R = never>(
  token: string | Redacted.Redacted<string>,
  key: SecretKey<"dir"> | KeyResolver<E, R>
): Effect.fn.Return<Decrypted, JoseError.JoseError | E, Aead.Aead | R> {
  const [header, encryptedKey, iv, ciphertext, tag] = yield* split(token, 5)
  if (encryptedKey !== "") return yield* invalidToken("A dir token must have an empty encrypted key")
  const protectedHeader = yield* decodeHeader(header, ProtectedHeader, ["crit", "zip"])
  const nonce = decodeSegment(iv)
  const data = decodeSegment(ciphertext)
  const authTag = decodeSegment(tag)
  if (
    nonce === undefined || data === undefined || authTag === undefined ||
    nonce.length !== Aead.aes256Gcm.nonceLength || authTag.length !== tagLength
  ) {
    return yield* invalidToken("The IV, ciphertext, or tag is malformed")
  }
  // Keep resolver mutations out of the authenticated result.
  const resolvedKey = typeof key === "function" ? yield* key({ ...protectedHeader }) : key
  const sealed = new Uint8Array(data.length + tagLength)
  sealed.set(data)
  sealed.set(authTag, data.length)
  const aead = yield* Aead.Aead
  const plaintext = yield* aead.decrypt(resolvedKey.key, sealed, { nonce, aad: utf8(header) }).pipe(
    Effect.mapError((error) =>
      error.reason._tag === "DecryptionFailed"
        ? new JoseError.JoseError({ reason: new JoseError.DecryptionFailed() })
        : cryptoFailure("Could not decrypt with the key")(error)
    )
  )
  return { protectedHeader, plaintext }
})
