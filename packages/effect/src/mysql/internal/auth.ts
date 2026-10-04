/** @internal */
import type * as Crypto from "../../Crypto.ts"
import * as Effect from "../../Effect.ts"
import { AuthenticationError, SqlError } from "../../sql/SqlError.ts"
import { concat, decoder, encoder, lengthEncoded, Reader, u32 } from "./protocol.ts"
export const authError = (message: string, cause?: unknown): SqlError =>
  new SqlError({ reason: new AuthenticationError({ message: `MySQL: ${message}`, cause, operation: "authenticate" }) })
export interface Handshake {
  readonly capabilities: number
  readonly salt: Uint8Array
  readonly plugin: string
}
export const handshake = (packet: Uint8Array): Handshake => {
  const r = new Reader(packet)
  if (r.u8() !== 10) throw authError("Unsupported server protocol")
  r.nul()
  r.u32()
  const salt1 = r.take(8)
  r.u8()
  let capabilities = r.u16()
  if (!r.remaining) throw authError("Protocol 4.1 is required")
  r.u8()
  r.u16()
  capabilities += r.u16() * 65536
  const authLength = r.u8()
  r.take(10)
  const salt2 = r.take(Math.min(r.remaining, Math.max(13, authLength - 8)))
  const salt = concat(salt1, salt2.subarray(0, salt2[salt2.length - 1] === 0 ? salt2.length - 1 : salt2.length))
  const plugin = (capabilities & 0x80000) !== 0 && r.remaining ? r.nul() : "mysql_native_password"
  return { capabilities, salt, plugin }
}
export const token = (
  crypto: Crypto.Crypto,
  plugin: string,
  password: string,
  salt: Uint8Array
): Effect.Effect<Uint8Array, SqlError> =>
  Effect.gen(function*() {
    if (plugin !== "mysql_native_password" && plugin !== "caching_sha2_password") {
      return yield* Effect.fail(authError(`Unsupported authentication plugin: ${plugin}`))
    }
    if (password.length === 0) return new Uint8Array(0)
    const digest = (algorithm: Crypto.DigestAlgorithm, bytes: Uint8Array) =>
      crypto.digest(algorithm, bytes).pipe(Effect.mapError((cause) => authError("Password digest failed", cause)))
    if (plugin === "mysql_native_password") {
      const first = yield* digest("SHA-1", encoder.encode(password))
      const second = yield* digest("SHA-1", first)
      const third = yield* digest("SHA-1", concat(salt, second))
      return first.map((b, i) => b ^ third[i])
    }
    if (plugin === "caching_sha2_password") {
      const first = yield* digest("SHA-256", encoder.encode(password))
      const second = yield* digest("SHA-256", first)
      const third = yield* digest("SHA-256", concat(second, salt))
      return first.map((b, i) => b ^ third[i])
    }
    return yield* Effect.fail(authError(`Unsupported authentication plugin: ${plugin}`))
  })
export const capabilities = (server: number, database: boolean, tls: boolean): number => {
  const required = 0x200 | 0x8000
  if ((server & required) !== required) throw authError("Server lacks required protocol capabilities")
  return (0x1 | 0x4 | 0x200 | 0x2000 | 0x8000 | 0x20000 | 0x40000 | 0x80000 | 0x200000 | (database ? 0x8 : 0) |
    (tls ? 0x800 : 0)) & server
}
export const header = (flags: number, maxPacketSize: number): Uint8Array =>
  concat(u32(flags), u32(maxPacketSize), Uint8Array.of(45), new Uint8Array(23))
export const response = (
  flags: number,
  maxPacketSize: number,
  username: string,
  database: string | undefined,
  plugin: string,
  auth: Uint8Array
): Uint8Array => {
  if ((flags & 0x200000) === 0 && auth.length > 255) {
    throw authError("Server lacks length-encoded authentication capability for RSA credentials")
  }
  return concat(
    header(flags, maxPacketSize),
    encoder.encode(username + "\0"),
    (flags & 0x200000) !== 0 ? lengthEncoded(auth) : concat(Uint8Array.of(auth.length), auth),
    (flags & 8) !== 0 ? encoder.encode((database ?? "") + "\0") : new Uint8Array(0),
    (flags & 0x80000) !== 0 ? encoder.encode(plugin + "\0") : new Uint8Array(0)
  )
}

interface DerValue {
  readonly tag: number
  readonly bytes: Uint8Array
}
const derValue = (reader: Reader): DerValue => {
  const tag = reader.u8()
  let length = reader.u8()
  if ((length & 128) !== 0) {
    const count = length & 127
    if (count === 0 || count > 4 || reader.remaining < count) throw authError("Invalid RSA public key DER length")
    const bytes = reader.take(count)
    if (bytes[0] === 0) throw authError("Invalid RSA public key DER length")
    length = 0
    for (const byte of bytes) length = length * 256 + byte
    if (length < 128) throw authError("Noncanonical RSA public key DER length")
  }
  return { tag, bytes: reader.take(length) }
}
const der = (tag: number, bytes: Uint8Array): Uint8Array => {
  let length = bytes.length
  const size: Array<number> = []
  if (length < 128) size.push(length)
  else {
    while (length > 0) {
      size.unshift(length & 255)
      length = Math.floor(length / 256)
    }
    size.unshift(128 | size.length)
  }
  return concat(Uint8Array.of(tag, ...size), bytes)
}
const rsaAlgorithm = Uint8Array.of(48, 13, 6, 9, 42, 134, 72, 134, 247, 13, 1, 1, 1, 5, 0)
const checkRsa = (bytes: Uint8Array): void => {
  const sequence = new Reader(bytes)
  const value = derValue(sequence)
  if (value.tag !== 48 || sequence.remaining !== 0) throw authError("Invalid RSA public key sequence")
  const integers = new Reader(value.bytes)
  for (let i = 0; i < 2; i++) {
    const integer = derValue(integers)
    if (
      integer.tag !== 2 || integer.bytes.length === 0 || (integer.bytes[0] & 128) !== 0 ||
      integer.bytes.every((b) => b === 0)
    ) throw authError("Invalid RSA public key integer")
    if (integer.bytes.length > 1 && integer.bytes[0] === 0 && (integer.bytes[1] & 128) === 0) {
      throw authError("Noncanonical RSA public key integer")
    }
  }
  if (integers.remaining !== 0) throw authError("Unexpected RSA public key data")
}
/** Converts RSA PEM or DER into validated SubjectPublicKeyInfo DER. */
export const publicKey = (input: string | Uint8Array): Uint8Array => {
  try {
    let bytes: Uint8Array
    let pkcs1 = false
    if (typeof input === "string" || (input.length > 0 && input[0] !== 48)) {
      const pem = (typeof input === "string" ? input : decoder.decode(input)).replace(/\0+$/, "")
      const match = /^\s*-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----\s*([A-Za-z0-9+/\s=]+)\s*-----END \1-----\s*$/.exec(
        pem
      )
      if (match === null) throw authError("Expected an RSA PUBLIC KEY or PUBLIC KEY PEM")
      const encoded = match[2].replace(/\s/g, "")
      if (encoded.length === 0 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
        throw authError("Invalid RSA public key PEM encoding")
      }
      bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
      pkcs1 = match[1] === "RSA PUBLIC KEY"
    } else bytes = input
    if (bytes.length === 0 || bytes.length > 1024 * 1024) throw authError("Invalid RSA public key size")
    const reader = new Reader(bytes)
    const outer = derValue(reader)
    if (outer.tag !== 48 || reader.remaining !== 0) throw authError("Invalid RSA public key DER")
    const contents = new Reader(outer.bytes)
    const algorithm = derValue(contents)
    if (pkcs1 || algorithm.tag === 2) {
      checkRsa(bytes)
      return der(48, concat(rsaAlgorithm, der(3, concat(Uint8Array.of(0), bytes))))
    }
    if (algorithm.tag !== 48) throw authError("Invalid RSA public key algorithm")
    const identifier = new Reader(algorithm.bytes)
    const oid = derValue(identifier)
    const expected = rsaAlgorithm.subarray(4, 13)
    if (oid.tag !== 6 || oid.bytes.length !== expected.length || !oid.bytes.every((b, i) => b === expected[i])) {
      throw authError("Public key is not an RSA encryption key")
    }
    if (identifier.remaining > 0) {
      const parameters = derValue(identifier)
      if (parameters.tag !== 5 || parameters.bytes.length !== 0 || identifier.remaining !== 0) {
        throw authError("Invalid RSA algorithm parameters")
      }
    }
    const key = derValue(contents)
    if (key.tag !== 3 || key.bytes[0] !== 0 || contents.remaining !== 0) {
      throw authError("Invalid RSA public key bit string")
    }
    checkRsa(key.bytes.subarray(1))
    return bytes.slice()
  } catch (cause) {
    if (cause instanceof SqlError && cause.reason._tag === "AuthenticationError") throw cause
    throw authError("Invalid RSA public key", cause)
  }
}
/** Encrypts the MySQL salted, NUL-terminated password using RSA-OAEP SHA-1. */
export const encryptPassword = (
  crypto: Crypto.Crypto,
  key: string | Uint8Array,
  password: string,
  salt: Uint8Array
): Effect.Effect<Uint8Array, SqlError> =>
  Effect.gen(function*() {
    if (salt.length === 0) return yield* Effect.fail(authError("Authentication challenge cannot be empty"))
    if (password.includes("\0")) {
      return yield* Effect.fail(authError("SHA password authentication does not support NUL bytes in passwords"))
    }
    const publicKeyBytes = yield* Effect.try({
      try: () => publicKey(key),
      catch: (cause) => cause instanceof SqlError ? cause : authError("Invalid RSA public key", cause)
    })
    if (crypto.rsaOaepEncrypt === undefined) {
      return yield* Effect.fail(authError("The Crypto service does not support RSA-OAEP encryption"))
    }
    const bytes = encoder.encode(password + "\0")
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= salt[i % salt.length]
    return yield* crypto.rsaOaepEncrypt({ publicKey: publicKeyBytes, data: bytes, hash: "SHA-1" }).pipe(
      Effect.mapError((cause) => authError("RSA-OAEP password encryption failed", cause))
    )
  })
