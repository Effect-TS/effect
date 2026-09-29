/**
 * Pure NTLMv2 computations for SQL Server Windows authentication.
 *
 * The module builds the NTLM `NEGOTIATE` message carried by `LOGIN7` and
 * answers the server's `CHALLENGE` with an `AUTHENTICATE` message (MS-NLMP).
 * Framing the messages in `LOGIN7` and SSPI packets stays in `MssqlProtocol`;
 * this module only computes their payloads.
 *
 * Every function is synchronous and deterministic: the module never generates
 * randomness or reads the clock, so callers pass the client challenge and the
 * current time.
 *
 * **Limitations**
 *
 * - NTLMv2 only; LM and NTLMv1 are refused.
 * - No channel binding, so servers that require Extended Protection reject
 *   the login.
 * - No Kerberos.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Result from "effect/Result"
import { createHmac } from "node:crypto"
import { md4 } from "./internal/md4.ts"
import { encodeUtf16 } from "./internal/utf16.ts"

/**
 * Error produced by an invalid or unsupported NTLM exchange.
 *
 * @category errors
 * @since 4.0.0
 */
export class AuthError extends Data.TaggedError("MssqlAuthError")<{
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

/** `NTLMSSP\0`. */
const signature = [0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00] as const

/** Unicode, NTLM, target info, extended session security, version, 128-bit and 56-bit. */
const negotiateFlags = 0xa2888205

const Flag = {
  Unicode: 0x00000001,
  ExtendedSessionSecurity: 0x00080000,
  TargetInfo: 0x00800000,
  Version: 0x02000000
} as const

const AvId = {
  EOL: 0,
  Flags: 6,
  Timestamp: 7
} as const

/** MsvAvFlags bit announcing that the message carries a MIC. */
const avFlagMic = 0x02

/** A Windows version stanza: 10.0, NTLM revision 15. */
const version = [10, 0, 0, 0, 0, 0, 0, 15] as const

/** Milliseconds between the FILETIME epoch (1601-01-01) and the Unix epoch. */
const filetimeEpochOffsetMillis = BigInt("11644473600000")

const hmac = (key: Uint8Array, ...data: ReadonlyArray<Uint8Array>): Uint8Array => {
  const h = createHmac("md5", key)
  for (const part of data) h.update(part)
  return new Uint8Array(h.digest())
}

const readUInt16 = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8)

const readUInt32 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0

const writeUInt16 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value
  bytes[offset + 1] = value >>> 8
}

const writeUInt32 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value
  bytes[offset + 1] = value >>> 8
  bytes[offset + 2] = value >>> 16
  bytes[offset + 3] = value >>> 24
}

const concat = (...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  let size = 0
  for (const part of parts) size += part.length
  const output = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

/**
 * Windows credentials for NTLM.
 *
 * @category models
 * @since 4.0.0
 */
export interface NtlmCredentials {
  readonly username: string
  readonly password: string
  readonly domain: string
}

/**
 * Computes the NTLMv2 response key, `HMAC-MD5(MD4(password), UPPER(user) + domain)`
 * (MS-NLMP 3.3.2).
 *
 * @category NTLM
 * @since 4.0.0
 */
export const ntlmResponseKey = (username: string, domain: string, password: string): Uint8Array =>
  hmac(md4(encodeUtf16(password)), encodeUtf16(username.toUpperCase() + domain))

/**
 * Builds an NTLM `NEGOTIATE` message without signing or key exchange.
 *
 * @category NTLM
 * @since 4.0.0
 */
export const ntlmNegotiate = (): Uint8Array => {
  const message = new Uint8Array(40)
  message.set(signature)
  writeUInt32(message, 8, 1)
  writeUInt32(message, 12, negotiateFlags)
  // Empty domain and workstation fields point just past the header.
  writeUInt32(message, 20, 40)
  writeUInt32(message, 28, 40)
  message.set(version, 32)
  return message
}

/** Returns a security buffer's bytes after checking that they lie inside the message. */
const securityBuffer = (message: Uint8Array, offset: number): Uint8Array => {
  if (offset + 8 > message.length) fail("Truncated NTLM security buffer")
  const length = readUInt16(message, offset)
  const start = readUInt32(message, offset + 4)
  if (readUInt16(message, offset + 2) < length || start < 48 || start + length > message.length) {
    fail("Invalid NTLM security buffer")
  }
  return message.subarray(start, start + length)
}

/**
 * Inputs for an NTLM `AUTHENTICATE` message.
 *
 * @category models
 * @since 4.0.0
 */
export interface NtlmAuthenticate {
  /** The server's `CHALLENGE` message. */
  readonly challenge: Uint8Array
  readonly credentials: NtlmCredentials
  /** An eight-byte client challenge. Use fresh random bytes for every login. */
  readonly clientNonce: Uint8Array
  /** The current time in milliseconds, used when the server sends no timestamp. */
  readonly time: number
  /** The `NEGOTIATE` message sent in `LOGIN7`, which the MIC covers. Defaults to `ntlmNegotiate()`. */
  readonly negotiate?: Uint8Array | undefined
}

/**
 * Answers an NTLM `CHALLENGE` with an NTLMv2 `AUTHENTICATE` message
 * (MS-NLMP 3.1.5.1.2 and 3.3.2).
 *
 * **Details**
 *
 * When the server sends a timestamp, the response uses it, omits the LMv2
 * response, and adds a MIC over all three messages, as MS-NLMP requires.
 *
 * @category NTLM
 * @since 4.0.0
 */
export const ntlmAuthenticate = (options: NtlmAuthenticate): Result.Result<Uint8Array, AuthError> =>
  result(() => {
    const challenge = options.challenge
    if (challenge.length < 48 || signature.some((byte, i) => challenge[i] !== byte) || readUInt32(challenge, 8) !== 2) {
      fail("Invalid NTLM challenge")
    }
    const serverFlags = readUInt32(challenge, 20)
    if (
      !(serverFlags & Flag.Unicode) || !(serverFlags & Flag.ExtendedSessionSecurity) ||
      !(serverFlags & Flag.TargetInfo)
    ) {
      fail("Server does not support NTLMv2 target information")
    }
    const target = securityBuffer(challenge, 40)
    const pairs: Array<Uint8Array> = []
    let timestamp: Uint8Array | undefined
    let avFlags: number | undefined
    let ended = false
    for (let offset = 0; offset < target.length;) {
      if (offset + 4 > target.length) fail("Truncated NTLM target info")
      const id = readUInt16(target, offset)
      const length = readUInt16(target, offset + 2)
      if (offset + 4 + length > target.length) fail("Invalid NTLM target info length")
      if (id === AvId.EOL) {
        if (length !== 0 || offset + 4 !== target.length) fail("Invalid NTLM target terminator")
        ended = true
        break
      }
      const value = target.subarray(offset + 4, offset + 4 + length)
      if (id === AvId.Timestamp) {
        if (length !== 8 || timestamp !== undefined) fail("Invalid NTLM server timestamp")
        timestamp = value.slice()
      }
      if (id === AvId.Flags) {
        if (length !== 4 || avFlags !== undefined) fail("Invalid NTLM flags")
        avFlags = readUInt32(value, 0)
      } else {
        pairs.push(target.slice(offset, offset + 4 + length))
      }
      offset += 4 + length
    }
    if (!ended) fail("Missing NTLM target terminator")
    const serverTimestamp = timestamp !== undefined
    const mic = serverTimestamp || ((avFlags ?? 0) & avFlagMic) !== 0
    if (avFlags !== undefined || mic) {
      const pair = new Uint8Array(8)
      writeUInt16(pair, 0, AvId.Flags)
      writeUInt16(pair, 2, 4)
      writeUInt32(pair, 4, (avFlags ?? 0) | (mic ? avFlagMic : 0))
      pairs.push(pair)
    }
    pairs.push(new Uint8Array(4))
    const targetInfo = concat(...pairs)
    const nonce = options.clientNonce
    if (nonce.length !== 8) fail("Invalid NTLM client challenge")
    if (timestamp === undefined) {
      timestamp = new Uint8Array(8)
      const filetime = (BigInt(Math.floor(options.time)) + filetimeEpochOffsetMillis) * BigInt(10000)
      new DataView(timestamp.buffer).setBigUint64(0, BigInt.asUintN(64, filetime), true)
    }
    // NTLMv2_CLIENT_CHALLENGE: version 1, reserved, timestamp, client challenge, AV pairs.
    const blob = new Uint8Array(28 + targetInfo.length + 4)
    blob[0] = blob[1] = 1
    blob.set(timestamp, 8)
    blob.set(nonce, 16)
    blob.set(targetInfo, 28)
    const key = ntlmResponseKey(options.credentials.username, options.credentials.domain, options.credentials.password)
    const serverNonce = challenge.subarray(24, 32)
    const proof = hmac(key, serverNonce, blob)
    const ntResponse = concat(proof, blob)
    const lmResponse = serverTimestamp ? new Uint8Array(24) : concat(hmac(key, serverNonce, nonce), nonce)
    const domain = encodeUtf16(options.credentials.domain)
    const username = encodeUtf16(options.credentials.username)
    const hasVersion = (serverFlags & Flag.Version) !== 0
    const micOffset = 64 + (hasVersion ? 8 : 0)
    const header = new Uint8Array(micOffset + (mic ? 16 : 0))
    header.set(signature)
    writeUInt32(header, 8, 3)
    writeUInt32(header, 60, (negotiateFlags & serverFlags) >>> 0)
    if (hasVersion) header.set(version, 64)
    const fields: ReadonlyArray<readonly [offset: number, data: Uint8Array]> = [
      [12, lmResponse],
      [20, ntResponse],
      [28, domain],
      [36, username],
      // Workstation and encrypted session key.
      [44, new Uint8Array(0)],
      [52, new Uint8Array(0)]
    ]
    let position = header.length
    for (const [offset, data] of fields) {
      if (data.length > 65535) fail("NTLM field too long")
      writeUInt16(header, offset, data.length)
      writeUInt16(header, offset + 2, data.length)
      writeUInt32(header, offset + 4, position)
      position += data.length
    }
    const message = concat(header, ...fields.map(([, data]) => data))
    if (mic) {
      message.set(hmac(hmac(key, proof), options.negotiate ?? ntlmNegotiate(), challenge, message), micOffset)
    }
    key.fill(0)
    return message
  })
