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
 * are not supported.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Encoding from "effect/Encoding"
import * as Result from "effect/Result"
import { createHash, createHmac, pbkdf2Sync } from "node:crypto"

/**
 * Error raised when an authentication exchange cannot be completed.
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

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: true })

const bytesOf = (value: Uint8Array): Uint8Array => Uint8Array.from(value)

const sha256 = (data: Uint8Array): Uint8Array => bytesOf(createHash("sha256").update(data).digest())

const hmacSha256 = (key: Uint8Array, data: Uint8Array): Uint8Array =>
  bytesOf(createHmac("sha256", key).update(data).digest())

const xor = (left: Uint8Array, right: Uint8Array): Uint8Array => {
  const result = new Uint8Array(left.length)
  for (let i = 0; i < left.length; i++) {
    result[i] = left[i] ^ right[i]
  }
  return result
}

const toBase64 = (bytes: Uint8Array): string => Encoding.encodeBase64(bytes)

const fromBase64 = (text: string, field: string): Uint8Array => {
  const decoded = Encoding.decodeBase64(text)
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
export const md5Password = (options: {
  readonly user: string
  readonly password: string
  readonly salt: Uint8Array
}): string => {
  const inner = createHash("md5").update(textEncoder.encode(options.password + options.user)).digest("hex")
  const outer = createHash("md5").update(textEncoder.encode(inner)).update(options.salt).digest("hex")
  return `md5${outer}`
}

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
    attributes.set(part.slice(0, separator), part.slice(separator + 1))
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
 * The returned bytes are the `initialResponse` of a `SASLInitialResponse`
 * message with mechanism `SCRAM_SHA_256`.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramInit = (options: {
  readonly password: string
  readonly nonce: string
}): { readonly state: ScramFirst; readonly response: Uint8Array } => {
  if (options.nonce.length === 0 || options.nonce.includes(",")) {
    return fail("SCRAM nonce must be a non-empty string that contains no comma")
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
 * Answers an `AuthenticationSASLContinue` challenge.
 *
 * The returned bytes are the payload of a `SASLResponse` message.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramContinue = (
  state: ScramFirst,
  challenge: Uint8Array
): { readonly state: ScramFinal; readonly response: Uint8Array } => {
  const serverFirstMessage = decodeUtf8(challenge, "the SCRAM server-first-message")
  const attributes = parseAttributes(serverFirstMessage)
  const nonce = attribute(attributes, "r")
  if (!nonce.startsWith(state.clientNonce) || nonce.length === state.clientNonce.length) {
    return fail("SCRAM server nonce does not extend the client nonce")
  }
  const salt = fromBase64(attribute(attributes, "s"), "s")
  const iterations = Number(attribute(attributes, "i"))
  if (!Number.isInteger(iterations) || iterations < 1) {
    return fail(`Invalid SCRAM iteration count: ${attribute(attributes, "i")}`)
  }

  const saltedPassword = bytesOf(
    pbkdf2Sync(textEncoder.encode(state.password), salt, iterations, 32, "sha256")
  )
  const clientKey = hmacSha256(saltedPassword, textEncoder.encode("Client Key"))
  const storedKey = sha256(clientKey)
  const clientFinalMessageWithoutProof = `c=${CHANNEL_BINDING},r=${nonce}`
  const authMessage = textEncoder.encode(
    `${state.clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageWithoutProof}`
  )
  const clientProof = xor(clientKey, hmacSha256(storedKey, authMessage))
  const serverKey = hmacSha256(saltedPassword, textEncoder.encode("Server Key"))

  return {
    state: {
      _tag: "ScramFinal",
      serverSignature: hmacSha256(serverKey, authMessage)
    },
    response: textEncoder.encode(`${clientFinalMessageWithoutProof},p=${toBase64(clientProof)}`)
  }
}

/**
 * Verifies the server signature carried by `AuthenticationSASLFinal`. Returns
 * nothing on success and raises `AuthError` when the server could not prove
 * that it knows the stored key.
 *
 * @category SCRAM
 * @since 4.0.0
 */
export const scramFinish = (state: ScramFinal, challenge: Uint8Array): void => {
  const attributes = parseAttributes(decodeUtf8(challenge, "the SCRAM server-final-message"))
  const error = attributes.get("e")
  if (error !== undefined) {
    fail(`SCRAM authentication failed: ${error}`)
  }
  const signature = fromBase64(attribute(attributes, "v"), "v")
  if (toBase64(state.serverSignature) !== toBase64(signature)) {
    fail("SCRAM server signature mismatch")
  }
}
