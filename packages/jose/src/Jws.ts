/**
 * Compact JSON Web Signatures with explicit algorithm allowlists and algorithm-bound verification keys.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { AlgorithmNotAllowed, InvalidKey, InvalidToken, SignatureVerificationFailed } from "./Errors.ts"
import { algorithms } from "./internal/algorithms.ts"
import { decode, json, JsonObject, parse, reveal, split, stringify, utf8 } from "./internal/encoding.ts"
import * as Hmac from "./internal/hmac.ts"
import * as KeyPolicy from "./internal/keyPolicy.ts"
import * as Signature from "./internal/signature.ts"
import {
  Algorithm,
  type PrivateJwk,
  type PublicKey,
  type SecretJwk,
  type SigningKey,
  type VerificationKey
} from "./Jwk.ts"
import { Jwks } from "./Jwks.ts"

/**
 * Schema for a supported protected JWS header and optional key and content identifiers.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Header = Schema.Struct({
  alg: Algorithm,
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
 * Schema requiring an explicit, non-empty allowlist of acceptable signature algorithms.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const VerifyOptions = Schema.Struct({
  algorithms: Schema.Array(Algorithm).check(Schema.isMinLength(1))
})

/**
 * Schema requiring an explicit, non-empty allowlist of acceptable signature algorithms.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type VerifyOptions = typeof VerifyOptions.Type

/**
 * Authenticated protected header and redacted payload bytes returned after signature verification.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Verified {
  readonly protectedHeader: Header
  readonly payload: Redacted.Redacted<Uint8Array>
}

/**
 * Service requirements for JWS operations, which use the runtime Web Crypto implementation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Requirements = never

const readHeader = Effect.fnUntraced(function*(input: unknown) {
  const raw = yield* parse(JsonObject, input, "header")

  // No extension handlers are installed. These options change authenticated
  // processing and may never be silently stripped by the structural schema.
  if (raw.crit !== undefined || raw.b64 !== undefined) {
    return yield* InvalidToken.make({ reason: "header" })
  }

  return yield* parse(Header, raw, "header")
})

const parseCompact = Effect.fnUntraced(function*(
  token: Redacted.Redacted<string>,
  options: VerifyOptions
) {
  const policy = yield* parse(VerifyOptions, options, "parameters")
  const [protectedPart, payloadPart, signaturePart] = yield* split(token, 3)

  if (protectedPart.length > 4096) return yield* InvalidToken.make({ reason: "header" })
  const protectedHeader = yield* readHeader(yield* json(yield* decode(protectedPart), "header"))

  if (!policy.algorithms.includes(protectedHeader.alg)) return yield* AlgorithmNotAllowed.make({})
  const payload = yield* decode(payloadPart)
  const signature = yield* decode(signaturePart)

  return {
    protectedHeader,
    payload,
    signature,
    signingInput: utf8(`${protectedPart}.${payloadPart}`)
  }
})

const verifyAsymmetric = Effect.fnUntraced(function*(
  parsed: Effect.Success<ReturnType<typeof parseCompact>>,
  key: PublicKey
) {
  const algorithm = parsed.protectedHeader.alg

  if (algorithm === "HS256" || key.algorithm !== algorithm) return yield* InvalidKey.make({})
  yield* KeyPolicy.check(key.jwk, algorithm, "verify")

  const valid = yield* Signature.verify({
    algorithm: algorithms[algorithm],
    publicKey: key.material,
    data: parsed.signingInput,
    signature: parsed.signature
  })

  if (!valid) return yield* SignatureVerificationFailed.make({})

  return {
    protectedHeader: parsed.protectedHeader,
    payload: Redacted.make(parsed.payload)
  } satisfies Verified
})

/**
 * Signs redacted payload bytes as a compact JWS using an algorithm-bound key.
 *
 * @stability unstable
 * @category cryptography
 * @since 4.0.5
 */
export const sign = Effect.fnUntraced(function*(
  payload: Redacted.Redacted<Uint8Array>,
  key: SigningKey,
  input: Header
) {
  const header = yield* readHeader(input)

  if (key.algorithm !== header.alg) return yield* InvalidKey.make({})
  yield* KeyPolicy.check(yield* reveal<PrivateJwk | SecretJwk>(key.jwk), header.alg, "sign")

  const data = yield* parse(
    Schema.Uint8Array.check(Schema.isMaxLength(45000)),
    yield* reveal(payload),
    "payload"
  )

  const protectedPart = Base64Url.encode(
    yield* stringify(header).pipe(Effect.mapError(() => InvalidToken.make({ reason: "header" })))
  )

  if (protectedPart.length > 4096) return yield* InvalidToken.make({ reason: "header" })
  const signingInput = `${protectedPart}.${Base64Url.encode(data)}`
  let signature: Uint8Array

  if (key._tag === "SecretKey") {
    if (header.alg !== "HS256") return yield* InvalidKey.make({})

    signature = yield* Hmac.sign({
      algorithm: "SHA-256",
      key: key.material,
      data: utf8(signingInput)
    })
  } else {
    if (header.alg === "HS256") return yield* InvalidKey.make({})

    signature = yield* Signature.sign({
      algorithm: algorithms[header.alg],
      privateKey: key.material,
      data: utf8(signingInput)
    })
  }

  return Redacted.make(`${signingInput}.${Base64Url.encode(signature)}`)
})

/**
 * Authenticates a compact JWS with an explicit key and algorithm allowlist.
 *
 * **Example** (Authenticating signed payload bytes)
 *
 * ```ts import.meta.vitest
 * import { Jwk, Jws } from "@effect/jose"
 * import { Effect, Redacted } from "effect"
 *
 * const payload = await Effect.runPromise(Effect.gen(function*() {
 *   // Fixed public example material; generate application secrets securely.
 *   const key = yield* Jwk.importSecret(
 *     Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" }),
 *     "HS256"
 *   )
 *   const token = yield* Jws.sign(Redacted.make(new TextEncoder().encode("hello")), key, { alg: "HS256" })
 *   const verified = yield* Jws.verify(token, key, { algorithms: ["HS256"] })
 *   return new TextDecoder().decode(Redacted.value(verified.payload))
 * }))
 * payload // => "hello"
 * ```
 *
 * @stability unstable
 * @category cryptography
 * @since 4.0.5
 */
export const verify = Effect.fnUntraced(function*(
  token: Redacted.Redacted<string>,
  key: VerificationKey,
  options: VerifyOptions
) {
  const parsed = yield* parseCompact(token, options)

  if (key._tag !== "SecretKey") return yield* verifyAsymmetric(parsed, key)
  const algorithm = parsed.protectedHeader.alg

  if (key.algorithm !== algorithm) return yield* InvalidKey.make({})
  yield* KeyPolicy.check(yield* reveal(key.jwk), algorithm, "verify")
  if (algorithm !== "HS256") return yield* InvalidKey.make({})

  const valid = yield* Hmac.verify({
    algorithm: "SHA-256",
    key: key.material,
    data: parsed.signingInput,
    tag: parsed.signature
  })

  if (!valid) return yield* SignatureVerificationFailed.make({})

  return {
    protectedHeader: parsed.protectedHeader,
    payload: Redacted.make(parsed.payload)
  } satisfies Verified
})

/**
 * Resolves an asymmetric verification key from the Jwks service and authenticates the compact JWS.
 *
 * @stability unstable
 * @category cryptography
 * @since 4.0.5
 */
export const verifyWithKeySet = Effect.fnUntraced(function*(
  token: Redacted.Redacted<string>,
  options: VerifyOptions
) {
  const parsed = yield* parseCompact(token, options)

  if (parsed.protectedHeader.alg === "HS256") return yield* InvalidKey.make({})
  const keys = yield* Jwks

  const key = yield* keys.resolve({
    algorithm: parsed.protectedHeader.alg,
    ...(parsed.protectedHeader.kid === undefined ? {} : { kid: parsed.protectedHeader.kid })
  })

  const verified = yield* verifyAsymmetric(parsed, key)

  return { ...verified, key }
})
