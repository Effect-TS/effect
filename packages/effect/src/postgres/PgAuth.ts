/**
 * Password authentication for the PostgreSQL protocol: MD5 and
 * SCRAM-SHA-256.
 *
 * Message framing lives in `PgProtocol` - SASL payloads travel as opaque
 * bytes - so this module only computes what goes inside them. Cleartext
 * authentication needs nothing from here; send the password as a
 * `PasswordMessage`.
 *
 * `SCRAM-SHA-256-PLUS` is not implemented: channel binding needs the TLS
 * socket, which this codec does not own. Passwords are used as UTF-8 without
 * SASLprep normalisation, so non-ASCII passwords that require normalisation
 * are not supported. Server iteration counts above 1,000,000 are rejected
 * before password derivation.
 *
 * @since 4.0.0
 */
import * as Crypto from "../Crypto.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as Hex from "../encoding/Hex.ts"
import * as Result from "../Result.ts"

/**
 * Failure returned when an authentication exchange cannot be completed.
 *
 * @category errors
 * @since 4.0.0
 */
export class AuthError extends Data.TaggedError("PgAuthError")<{
  readonly message: string
}> {}

const fail = (message: string): never => {
  throw new AuthError({ message })
}

const result = <A>(evaluate: () => A): Result.Result<A, AuthError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof AuthError) return Result.fail(error)
    throw error
  }
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: true })
/** Bounds PBKDF2 work requested by an untrusted server. */
const maxScramIterations = 1_000_000

const xor = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const result = new Uint8Array(left.length)
  for (let i = 0; i < left.length; i++) {
    result[i] = left[i] ^ right[i]
  }
  return result
}

const toBase64 = (bytes: Uint8Array): string => Base64.encode(bytes)

const fromBase64 = (text: string, field: string): Uint8Array => {
  const decoded = Base64.decode(text)
  if (Result.isFailure(decoded)) {
    return fail(`Invalid base64 in SCRAM attribute "${field}"`)
  }
  return decoded.success
}

const decodeUtf8 = (bytes: Uint8Array, what: string): string => {
  try {
    return textDecoder.decode(bytes)
  } catch {
    return fail(`Invalid UTF-8 in ${what}`)
  }
}

/**
 * Computes the password string for an `AuthenticationMD5Password` challenge:
 * `"md5" + md5(md5(password + user) + salt)`. Send the result verbatim as a
 * `PasswordMessage`.
 *
 * @category MD5
 * @since 4.0.0
 */
export const md5Password = Effect.fnUntraced(function*(options: {
  readonly user: string
  readonly password: string
  readonly salt: Uint8Array
}): Effect.fn.Return<string, AuthError, Crypto.Crypto> {
  if (options.salt.length !== 4) {
    return yield* new AuthError({
      message: `PostgreSQL MD5 salt must be exactly 4 bytes, received ${options.salt.length}`
    })
  }
  const crypto = yield* Crypto.Crypto
  const inner = Hex.encode(
    yield* crypto.digest("MD5", textEncoder.encode(options.password + options.user)).pipe(
      Effect.mapError((error) => new AuthError({ message: error.message }))
    )
  )
  const input = new Uint8Array(inner.length + options.salt.length)
  input.set(textEncoder.encode(inner))
  input.set(options.salt, inner.length)
  const outer = yield* crypto.digest("MD5", input).pipe(
    Effect.mapError((error) => new AuthError({ message: error.message }))
  )
  return `md5${Hex.encode(outer)}`
})

/**
 * The only SASL mechanism this module implements.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const SCRAM_SHA_256 = "SCRAM-SHA-256"

/**
 * State after the client's first message, awaiting the server's challenge.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export interface ScramFirst {
  readonly _tag: "ScramFirst"
  readonly password: string
  readonly clientNonce: string
  readonly clientFirstMessageBare: string
}

/**
 * State after the client's final message, awaiting the server signature.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export interface ScramFinal {
  readonly _tag: "ScramFinal"
  readonly serverSignature: Uint8Array
}

/**
 * The SCRAM exchange state.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export type ScramState = ScramFirst | ScramFinal

const GS2_HEADER = "n,,"
/** Base64 of the GS2 header, the `c=` attribute value without channel binding. */
const CHANNEL_BINDING = "biws"

const parseAttributes = (message: string): Map<string, string> => {
  const attributes = new Map<string, string>()
  for (const part of message.split(",")) {
    const separator = part.indexOf("=")
    if (separator < 1) {
      return fail(`Malformed SCRAM attribute: "${part}"`)
    }
    const key = part.slice(0, separator)
    if (attributes.has(key)) {
      return fail(`Duplicate SCRAM attribute "${key}"`)
    }
    attributes.set(key, part.slice(separator + 1))
  }
  return attributes
}

const attribute = (attributes: Map<string, string>, key: string): string =>
  attributes.get(key) ?? fail(`Missing SCRAM attribute "${key}"`)

/**
 * Starts a SCRAM-SHA-256 exchange. The `nonce` must be a fresh, random,
 * printable ASCII string chosen by the caller; this module never generates
 * randomness.
 *
 * The successful result contains the `initialResponse` bytes for a
 * `SASLInitialResponse` message with mechanism `SCRAM_SHA_256`.
 *
 * @category SCRAM
 * @since 4.0.0
 */
const scramInitUnsafe = (options: {
  readonly password: string
  readonly nonce: string
}): { readonly state: ScramFirst; readonly response: Uint8Array } => {
  if (!/^[\x21-\x2b\x2d-\x7e]+$/.test(options.nonce)) {
    return fail("SCRAM nonce must contain only printable ASCII characters other than comma")
  }
  const clientFirstMessageBare = `n=,r=${options.nonce}`
  return {
    state: {
      _tag: "ScramFirst",
      password: options.password,
      clientNonce: options.nonce,
      clientFirstMessageBare
    },
    response: textEncoder.encode(GS2_HEADER + clientFirstMessageBare)
  }
}

/**
 * Creates the first SCRAM-SHA-256 client message.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramInit = (options: {
  readonly password: string
  readonly nonce: string
}): Result.Result<{ readonly state: ScramFirst; readonly response: Uint8Array }, AuthError> =>
  result(() => scramInitUnsafe(options))

/**
 * Answers an `AuthenticationSASLContinue` challenge.
 *
 * The successful effect contains the payload bytes for a `SASLResponse`
 * message.
 *
 * @category SCRAM
 * @since 4.0.0
 */
const parseChallenge = (
  state: ScramFirst,
  challenge: Uint8Array
): {
  readonly serverFirstMessage: string
  readonly nonce: string
  readonly salt: Uint8Array
  readonly iterations: number
} => {
  const serverFirstMessage = decodeUtf8(challenge, "the SCRAM server-first-message")
  const attributes = parseAttributes(serverFirstMessage)
  const nonce = attribute(attributes, "r")
  if (!nonce.startsWith(state.clientNonce) || nonce.length === state.clientNonce.length) {
    return fail("SCRAM server nonce does not extend the client nonce")
  }
  const saltText = attribute(attributes, "s")
  if (saltText.length === 0) {
    return fail("SCRAM salt must not be empty")
  }
  const salt = fromBase64(saltText, "s")
  const iterationText = attribute(attributes, "i")
  const iterations = Number(iterationText)
  if (
    !/^[1-9]\d*$/.test(iterationText) ||
    !Number.isSafeInteger(iterations) ||
    iterations > maxScramIterations
  ) {
    return fail(`Invalid SCRAM iteration count: ${iterationText}`)
  }

  return { serverFirstMessage, nonce, salt, iterations }
}

/**
 * Processes the server's SCRAM challenge and creates the client proof using
 * the platform cryptography service.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramContinue = Effect.fnUntraced(function*(
  state: ScramFirst,
  challenge: Uint8Array
): Effect.fn.Return<{ readonly state: ScramFinal; readonly response: Uint8Array }, AuthError, Crypto.Crypto> {
  const parsed = result(() => parseChallenge(state, challenge))
  if (Result.isFailure(parsed)) return yield* parsed.failure
  const { serverFirstMessage, nonce, salt, iterations } = parsed.success
  const crypto = yield* Crypto.Crypto
  const derive = <A>(effect: Effect.Effect<A, { readonly message: string }>) =>
    Effect.mapError(effect, (error) => new AuthError({ message: error.message }))
  const saltedPassword = yield* derive(
    crypto.pbkdf2("SHA-256", textEncoder.encode(state.password), salt, iterations, 32)
  )
  const clientKey = yield* derive(crypto.hmac("SHA-256", saltedPassword, textEncoder.encode("Client Key")))
  const storedKey = yield* derive(crypto.digest("SHA-256", clientKey))
  const clientFinalMessageWithoutProof = `c=${CHANNEL_BINDING},r=${nonce}`
  const authMessage = textEncoder.encode(
    `${state.clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageWithoutProof}`
  )
  const clientProof = xor(clientKey, yield* derive(crypto.hmac("SHA-256", storedKey, authMessage)))
  const serverKey = yield* derive(crypto.hmac("SHA-256", saltedPassword, textEncoder.encode("Server Key")))
  return {
    state: {
      _tag: "ScramFinal",
      serverSignature: yield* derive(crypto.hmac("SHA-256", serverKey, authMessage))
    },
    response: textEncoder.encode(`${clientFinalMessageWithoutProof},p=${toBase64(clientProof)}`)
  }
})

/**
 * Verifies the server signature carried by `AuthenticationSASLFinal`. Returns
 * `Result.void` on success and an `AuthError` failure when the server could
 * not prove that it knows the stored key.
 *
 * @category SCRAM
 * @since 4.0.0
 */
const scramFinishUnsafe = (state: ScramFinal, challenge: Uint8Array): void => {
  const attributes = parseAttributes(decodeUtf8(challenge, "the SCRAM server-final-message"))
  const error = attributes.get("e")
  if (error !== undefined) {
    fail(`SCRAM authentication failed: ${error}`)
  }
  const signature = fromBase64(attribute(attributes, "v"), "v")
  let difference = state.serverSignature.length ^ signature.length
  for (let i = 0; i < state.serverSignature.length; i++) {
    difference |= state.serverSignature[i] ^ (signature[i] ?? 0)
  }
  if (difference !== 0) {
    fail("SCRAM server signature mismatch")
  }
}

/**
 * Verifies the server's final SCRAM message.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramFinish = (
  state: ScramFinal,
  challenge: Uint8Array
): Result.Result<void, AuthError> => result(() => scramFinishUnsafe(state, challenge))
