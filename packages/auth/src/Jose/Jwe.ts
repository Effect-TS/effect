/**
 * Compact direct A256GCM encryption with authenticated protected headers and redacted plaintext.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Aes from "effect/crypto/Aes"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { copy, decode as decodeInput, native, operationError, withSecret } from "../internal/crypto.ts"
import { decode, json, JsonObject, parse, reveal, split, stringify, utf8 } from "../internal/encoding.ts"
import * as KeyPolicy from "../internal/keyPolicy.ts"
import { CryptoUnavailable, DecryptionFailed, InvalidKey, InvalidToken, type OperationError } from "../JoseError.ts"
import type { SecretKey } from "./Jwk.ts"

/**
 * Schema for direct symmetric encryption with A256GCM and optional key and content identifiers.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Header = Schema.Struct({
  alg: Schema.Literal("dir"),
  enc: Schema.Literal("A256GCM"),
  kid: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  typ: Schema.optionalKey(Schema.NonEmptyString),
  cty: Schema.optionalKey(Schema.NonEmptyString)
})

/**
 * Value described by the Header schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Header = typeof Header.Type
/**
 * Failures produced by compact encryption, decryption, key validation, or cryptographic operations.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.5
 */
export type JweError = InvalidToken | InvalidKey | OperationError | DecryptionFailed

const readHeader = Effect.fnUntraced(function*(input: unknown) {
  const raw = yield* parse(JsonObject, input, "header")

  if (raw.crit !== undefined || raw.zip !== undefined) {
    return yield* InvalidToken.make({ reason: "header" })
  }

  return yield* parse(Header, raw, "header")
})

/**
 * Encrypts redacted plaintext as a compact JWE with a fresh 96-bit IV from the SecureRandom service.
 *
 * **Details**
 *
 * Random-source failures become typed CryptoUnavailable errors without exposing native causes.
 *
 * **Example** (Encrypting and authenticating plaintext)
 *
 * ```ts import.meta.vitest
 * import { Jwe, Jwk } from "@effect/auth/Jose"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { Effect, Redacted } from "effect"
 *
 * const plaintext = await Effect.runPromise(Effect.gen(function*() {
 *   // Fixed public example material; generate application secrets securely.
 *   const key = yield* Jwk.importSecret(
 *     Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" }),
 *     "dir"
 *   )
 *   const token = yield* Jwe.encrypt(
 *     Redacted.make(new TextEncoder().encode("private message")), key, { alg: "dir", enc: "A256GCM" }
 *   )
 *   const decrypted = yield* Jwe.decrypt(token, key)
 *   return new TextDecoder().decode(Redacted.value(decrypted.plaintext))
 * }).pipe(Effect.provide(NodeCrypto.layer)))
 * plaintext // => "private message"
 * ```
 *
 * @see {@link decrypt}
 *
 * @stability unstable
 * @category cryptography
 * @since 4.0.5
 */
export const encrypt = Effect.fnUntraced(function*(
  plaintext: Redacted.Redacted<Uint8Array>,
  key: SecretKey,
  input: Header
): Effect.fn.Return<Redacted.Redacted<string>, JweError, Aes.Aes | SecureRandom.SecureRandom> {
  const header = yield* readHeader(input)

  if (key.algorithm !== "dir") return yield* InvalidKey.make({})
  yield* KeyPolicy.check(yield* reveal(key.jwk), "dir", "encrypt")
  yield* parse(
    Schema.Uint8Array.check(Schema.isMaxLength(45000)),
    yield* reveal(plaintext),
    "payload"
  )

  const protectedPart = Base64Url.encode(
    yield* stringify(header).pipe(Effect.mapError(() => InvalidToken.make({ reason: "header" })))
  )

  if (protectedPart.length > 4096) return yield* InvalidToken.make({ reason: "header" })
  const nonce = yield* SecureRandom.randomBytes(12).pipe(
    Effect.mapError(() => CryptoUnavailable.make({})),
    Effect.flatMap(copy)
  )
  yield* decodeInput(Schema.Uint8Array.check(Schema.isBetweenLength(12, 12)), nonce, "nonce")
  const aes = yield* Aes.Aes
  const sealed = yield* withSecret(plaintext, (data) =>
    withSecret(key.material, (owned) =>
      Effect.gen(function*() {
        yield* decodeInput(Schema.Uint8Array.check(Schema.isBetweenLength(32, 32)), owned, "key")
        return yield* native(aes.encryptGcm({
          key: Redacted.make(owned),
          nonce,
          data,
          additionalData: utf8(protectedPart)
        }))
      })))

  return Redacted.make(
    `${protectedPart}..${Base64Url.encode(nonce)}.${Base64Url.encode(sealed.subarray(0, -16))}.${
      Base64Url.encode(sealed.subarray(-16))
    }`
  )
})

/**
 * Authenticates and decrypts a compact direct A256GCM JWE, returning redacted plaintext and its protected header.
 *
 * @see {@link encrypt}
 *
 * @stability unstable
 * @category cryptography
 * @since 4.0.5
 */
export const decrypt = Effect.fnUntraced(function*(
  token: Redacted.Redacted<string>,
  key: SecretKey
) {
  const [protectedPart, encryptedKey, iv, ciphertext, tag] = yield* split(token, 5)

  if (encryptedKey !== "" || protectedPart.length > 4096) {
    return yield* InvalidToken.make({ reason: "serialization" })
  }
  const protectedHeader = yield* readHeader(yield* json(yield* decode(protectedPart), "header"))

  if (key.algorithm !== "dir") return yield* InvalidKey.make({})
  yield* KeyPolicy.check(yield* reveal(key.jwk), "dir", "decrypt")
  const nonce = yield* decode(iv)
  const data = yield* decode(ciphertext)
  const authTag = yield* decode(tag)

  if (nonce.length !== 12 || authTag.length !== 16) {
    return yield* InvalidToken.make({ reason: "serialization" })
  }
  const sealed = new Uint8Array(data.length + authTag.length)

  sealed.set(data)
  sealed.set(authTag, data.length)

  const aes = yield* Aes.Aes
  const plaintext = yield* withSecret(key.material, (owned) =>
    Effect.gen(function*() {
      yield* decodeInput(Schema.Uint8Array.check(Schema.isBetweenLength(32, 32)), owned, "key")
      return yield* aes.decryptGcm({
        key: Redacted.make(owned),
        nonce,
        data: sealed,
        additionalData: utf8(protectedPart)
      }).pipe(
        Effect.mapError((error) =>
          error.reason._tag === "AuthenticationFailed" ? DecryptionFailed.make({}) : operationError(error)
        ),
        Effect.map(Redacted.make)
      )
    }))

  return { protectedHeader, plaintext }
})
