/**
 * SSH cryptography on top of the `Crypto` service: key exchange, host key
 * signature verification, packet protection, and key derivation.
 *
 * @internal
 */
import type * as Crypto from "../../Crypto.ts"
import * as Effect from "../../Effect.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import { SshError, SshProtocolError } from "../SshError.ts"
import * as WebCrypto from "./webcrypto.ts"
import type { Bytes } from "./wire.ts"
import { concat, copy, padStart, Reader, stripLeadingZeros, utf8, WireError, Writer } from "./wire.ts"

/** @internal */
export type HashName = Crypto.HmacAlgorithm

/** @internal */
export const cryptoError = (description: string) => (cause: unknown) =>
  new SshError({ reason: new SshProtocolError({ description, cause }) })

/** @internal */
export const MacError = "message authentication failed"

/**
 * Runs a synchronous decoder, turning malformed input into a protocol error.
 *
 * @internal
 */
export const decode = <A>(description: string, f: () => A): Effect.Effect<A, SshError> =>
  Effect.try({ try: f, catch: (cause) => cryptoError(cause instanceof WireError ? cause.message : description)(cause) })

/** @internal */
export const base64Url = (bytes: Uint8Array): string => Base64Url.encode(bytes)

/** @internal */
export const digest = (crypto: Crypto.Crypto, hash: HashName, data: Uint8Array): Effect.Effect<Bytes, SshError> =>
  Effect.mapError(crypto.digest(hash, data), cryptoError(`${hash} digest failed`)) as Effect.Effect<Bytes, SshError>

// -----------------------------------------------------------------------------
// Key exchange
// -----------------------------------------------------------------------------

/** @internal */
export interface KexMethod {
  readonly name: string
  readonly hash: HashName
  readonly generate: Effect.Effect<WebCrypto.KeyAgreement, SshError>
}

const curve25519 = (name: string): KexMethod => ({ name, hash: "SHA-256", generate: WebCrypto.x25519 })

/** @internal */
export const kexMethods: Record<string, KexMethod> = {
  "curve25519-sha256": curve25519("curve25519-sha256"),
  "curve25519-sha256@libssh.org": curve25519("curve25519-sha256@libssh.org"),
  "ecdh-sha2-nistp256": { name: "ecdh-sha2-nistp256", hash: "SHA-256", generate: WebCrypto.ecdh("P-256") },
  "ecdh-sha2-nistp384": { name: "ecdh-sha2-nistp384", hash: "SHA-384", generate: WebCrypto.ecdh("P-384") },
  "ecdh-sha2-nistp521": { name: "ecdh-sha2-nistp521", hash: "SHA-512", generate: WebCrypto.ecdh("P-521") }
}

/**
 * Derives session key material (RFC 4253 §7.2).
 *
 * @internal
 */
export const deriveKey = Effect.fnUntraced(function*(
  crypto: Crypto.Crypto,
  hash: HashName,
  sharedSecret: Uint8Array,
  exchangeHash: Uint8Array,
  letter: string,
  sessionId: Uint8Array,
  length: number
) {
  const k = new Writer().mpint(sharedSecret).finish()
  let out = yield* digest(crypto, hash, concat([k, exchangeHash, utf8(letter), sessionId]))
  while (out.length < length) {
    out = concat([out, yield* digest(crypto, hash, concat([k, exchangeHash, out]))])
  }
  return out.subarray(0, length)
})

// -----------------------------------------------------------------------------
// Public key signatures
// -----------------------------------------------------------------------------

/** @internal */
export interface EcdsaCurve {
  readonly identifier: string
  readonly namedCurve: Crypto.NamedCurve
  readonly hash: HashName
  readonly size: number
}

/** @internal */
export const ecdsaCurves: Record<string, EcdsaCurve> = {
  "ecdsa-sha2-nistp256": { identifier: "nistp256", namedCurve: "P-256", hash: "SHA-256", size: 32 },
  "ecdsa-sha2-nistp384": { identifier: "nistp384", namedCurve: "P-384", hash: "SHA-384", size: 48 },
  "ecdsa-sha2-nistp521": { identifier: "nistp521", namedCurve: "P-521", hash: "SHA-512", size: 66 }
}

/** @internal */
export const rsaSignatureHashes: Record<string, HashName> = {
  "rsa-sha2-256": "SHA-256",
  "rsa-sha2-512": "SHA-512"
}

/**
 * Returns the signature algorithms usable with a public key type.
 *
 * @internal
 */
export const signatureAlgorithmsForKeyType = (keyType: string): ReadonlyArray<string> => {
  switch (keyType) {
    case "ssh-rsa":
      return ["rsa-sha2-512", "rsa-sha2-256"]
    case "ssh-ed25519":
    case "ecdsa-sha2-nistp256":
    case "ecdsa-sha2-nistp384":
    case "ecdsa-sha2-nistp521":
      return [keyType]
    default:
      return []
  }
}

/**
 * Returns the public key type used by a signature algorithm.
 *
 * @internal
 */
export const keyTypeForSignatureAlgorithm = (algorithm: string): string =>
  algorithm in rsaSignatureHashes ? "ssh-rsa" : algorithm

/**
 * Converts an IEEE P1363 ECDSA signature (`r || s`) into the SSH
 * `mpint r, mpint s` encoding.
 *
 * @internal
 */
export const ecdsaP1363ToSsh = (signature: Uint8Array): Bytes => {
  const half = signature.length / 2
  return new Writer().mpint(signature.subarray(0, half)).mpint(signature.subarray(half)).finish()
}

/**
 * Converts an SSH `mpint r, mpint s` ECDSA signature into IEEE P1363.
 *
 * @internal
 */
export const ecdsaSshToP1363 = (signature: Uint8Array, size: number): Bytes => {
  const reader = new Reader(signature)
  const r = reader.mpint()
  const s = reader.mpint()
  return concat([padStart(r, size), padStart(s, size)])
}

/**
 * Describes how to verify signatures for a public key blob with the `Crypto`
 * service.
 */
interface VerifyPlan {
  readonly jwk: Crypto.Jwk
  readonly algorithm: Crypto.KeyPairAlgorithm
  readonly options: Crypto.SigningOptions
  readonly signature: (raw: Uint8Array) => Uint8Array | undefined
}

const verifyPlan = (blob: Uint8Array, algorithm: string): VerifyPlan => {
  const reader = new Reader(blob)
  const keyType = reader.utf8()
  if (keyType !== keyTypeForSignatureAlgorithm(algorithm)) {
    throw new WireError(`key type ${keyType} does not match signature algorithm ${algorithm}`)
  }
  if (keyType === "ssh-ed25519") {
    const key = reader.string()
    if (key.length !== 32) throw new WireError("invalid ed25519 public key")
    return {
      jwk: { kty: "OKP", crv: "Ed25519", x: base64Url(key) },
      algorithm: { name: "Ed25519" },
      options: { name: "Ed25519" },
      signature: (raw) => raw
    }
  }
  const curve = ecdsaCurves[keyType]
  if (curve !== undefined) {
    if (reader.utf8() !== curve.identifier) throw new WireError("ecdsa curve mismatch")
    const point = reader.string()
    if (point[0] !== 4 || point.length !== 1 + curve.size * 2) throw new WireError("invalid ecdsa public point")
    return {
      jwk: {
        kty: "EC",
        crv: curve.namedCurve,
        x: base64Url(point.subarray(1, 1 + curve.size)),
        y: base64Url(point.subarray(1 + curve.size))
      },
      algorithm: { name: "ECDSA", namedCurve: curve.namedCurve },
      options: { name: "ECDSA", hash: curve.hash },
      signature: (raw) => ecdsaSshToP1363(raw, curve.size)
    }
  }
  const rsaHash = rsaSignatureHashes[algorithm]
  if (keyType === "ssh-rsa" && rsaHash !== undefined) {
    const e = stripLeadingZeros(reader.mpint())
    const n = stripLeadingZeros(reader.mpint())
    return {
      jwk: { kty: "RSA", e: base64Url(e), n: base64Url(n) },
      algorithm: { name: "RSASSA-PKCS1-v1_5", hash: rsaHash },
      options: { name: "RSASSA-PKCS1-v1_5" },
      // OpenSSH may strip leading zero bytes from RSA signatures.
      signature: (raw) => raw.length > n.length ? undefined : padStart(raw, n.length)
    }
  }
  throw new WireError(`unsupported public key algorithm ${algorithm}`)
}

/**
 * Verifies an SSH signature blob (`string algorithm, string signature`)
 * against a public key blob. When `expectedAlgorithm` is provided, the
 * signature must use exactly that algorithm.
 *
 * @internal
 */
export const verifySignature = Effect.fnUntraced(function*(crypto: Crypto.Crypto, options: {
  readonly publicKey: Uint8Array
  readonly signature: Uint8Array
  readonly data: Uint8Array
  readonly expectedAlgorithm?: string | undefined
}) {
  const { algorithm, raw } = yield* decode("malformed signature", () => {
    const reader = new Reader(options.signature)
    return { algorithm: reader.utf8(), raw: reader.string() }
  })
  if (options.expectedAlgorithm !== undefined && algorithm !== options.expectedAlgorithm) return false
  const plan = yield* decode("malformed public key", () => verifyPlan(options.publicKey, algorithm))
  const signature = yield* decode("malformed signature", () => plan.signature(raw))
  if (signature === undefined) return false
  const key = yield* Effect.mapError(
    crypto.importJwk(plan.jwk, plan.algorithm, { usages: ["verify"] }),
    cryptoError(`could not import ${algorithm} public key`)
  )
  return yield* Effect.mapError(
    crypto.verify(plan.options, key, signature, options.data),
    cryptoError(`could not verify ${algorithm} signature`)
  )
})

/** @internal */
export const fingerprintSha256 = (crypto: Crypto.Crypto, blob: Uint8Array): Effect.Effect<string, SshError> =>
  Effect.map(digest(crypto, "SHA-256", blob), (hash) => "SHA256:" + base64NoPad(hash))

const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/** @internal */
export const base64NoPad = (bytes: Uint8Array): string => {
  let out = ""
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += base64Chars[(n >> 18) & 63] + base64Chars[(n >> 12) & 63] + base64Chars[(n >> 6) & 63] +
      base64Chars[n & 63]
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((i + 1 < bytes.length ? bytes[i + 1] : 0) << 8)
    out += base64Chars[(n >> 18) & 63] + base64Chars[(n >> 12) & 63]
    if (i + 1 < bytes.length) out += base64Chars[(n >> 6) & 63]
  }
  return out
}

// -----------------------------------------------------------------------------
// Packet protection
// -----------------------------------------------------------------------------

/** @internal */
export interface CipherAlgorithm {
  readonly name: string
  readonly keyLength: number
  readonly ivLength: number
  readonly blockSize: number
  readonly mode: "gcm" | "ctr"
}

/** @internal */
export const cipherAlgorithms: Record<string, CipherAlgorithm> = {
  "aes256-gcm@openssh.com": { name: "aes256-gcm@openssh.com", keyLength: 32, ivLength: 12, blockSize: 16, mode: "gcm" },
  "aes128-gcm@openssh.com": { name: "aes128-gcm@openssh.com", keyLength: 16, ivLength: 12, blockSize: 16, mode: "gcm" },
  "aes256-ctr": { name: "aes256-ctr", keyLength: 32, ivLength: 16, blockSize: 16, mode: "ctr" },
  "aes128-ctr": { name: "aes128-ctr", keyLength: 16, ivLength: 16, blockSize: 16, mode: "ctr" }
}

/** @internal */
export interface MacAlgorithm {
  readonly name: string
  readonly hash: HashName
  readonly keyLength: number
  readonly etm: boolean
}

/** @internal */
export const macAlgorithms: Record<string, MacAlgorithm> = {
  "hmac-sha2-256-etm@openssh.com": { name: "hmac-sha2-256-etm@openssh.com", hash: "SHA-256", keyLength: 32, etm: true },
  "hmac-sha2-512-etm@openssh.com": { name: "hmac-sha2-512-etm@openssh.com", hash: "SHA-512", keyLength: 64, etm: true },
  "hmac-sha2-256": { name: "hmac-sha2-256", hash: "SHA-256", keyLength: 32, etm: false },
  "hmac-sha2-512": { name: "hmac-sha2-512", hash: "SHA-512", keyLength: 64, etm: false }
}

/** @internal */
export const MAX_PACKET_LENGTH = 256 * 1024

/**
 * Seals outgoing payloads into complete wire packets.
 *
 * @internal
 */
export interface Sealer {
  readonly seal: (sequence: number, payload: Uint8Array) => Effect.Effect<Bytes, SshError>
}

/**
 * Opens incoming packets in two phases: `headerLength` bytes are read and
 * passed to `begin`, which returns the number of remaining bytes; those are
 * then passed to `finish`, which returns the payload.
 *
 * @internal
 */
export interface Opener {
  readonly headerLength: number
  readonly begin: (header: Bytes) => Effect.Effect<number, SshError>
  readonly finish: (sequence: number, header: Bytes, rest: Bytes) => Effect.Effect<Uint8Array, SshError>
}

const macFailure = () => cryptoError(MacError)(undefined)

const paddingFor = (unpaddedLength: number, blockSize: number): number => {
  let padding = blockSize - (unpaddedLength % blockSize)
  if (padding < 4) padding += blockSize
  return padding
}

const sequenceBytes = (sequence: number): Bytes => {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, sequence >>> 0)
  return out
}

const readLength = (bytes: Uint8Array): number =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0)

const checkPacketLength = (length: number, blockSize: number, aligned: number): Effect.Effect<void, SshError> =>
  length < 5 || length > MAX_PACKET_LENGTH || aligned % blockSize !== 0
    ? Effect.fail(cryptoError(`invalid packet length ${length}`)(undefined))
    : Effect.void

const extractPayload = (body: Uint8Array): Effect.Effect<Uint8Array, SshError> => {
  const padding = body[0]
  if (padding < 4 || padding + 1 > body.length) return Effect.fail(cryptoError("invalid packet padding")(undefined))
  return Effect.succeed(body.subarray(1, body.length - padding))
}

/**
 * Builds `padding_length || payload || padding`, optionally aligning the
 * packet length field with the cipher blocks.
 */
const buildPlaintext = Effect.fnUntraced(function*(
  crypto: Crypto.Crypto,
  payload: Uint8Array,
  blockSize: number,
  lengthAligned: boolean
) {
  const padding = paddingFor(lengthAligned ? 5 + payload.length : 1 + payload.length, blockSize)
  const random = yield* Effect.mapError(crypto.randomBytes(padding), cryptoError("could not generate padding"))
  const body = new Uint8Array(1 + payload.length + padding)
  body[0] = padding
  body.set(payload, 1)
  body.set(random, 1 + payload.length)
  const lengthBytes = new Uint8Array(4)
  new DataView(lengthBytes.buffer).setUint32(0, body.length)
  return { lengthBytes, body }
})

/** @internal */
export const noneSealer = (crypto: Crypto.Crypto): Sealer => ({
  seal: (_sequence, payload) =>
    Effect.map(buildPlaintext(crypto, payload, 8, true), ({ body, lengthBytes }) => concat([lengthBytes, body]))
})

/** @internal */
export const noneOpener: Opener = {
  headerLength: 4,
  begin: (header) => {
    const length = readLength(header)
    return Effect.as(checkPacketLength(length, 1, length), length)
  },
  finish: (_sequence, _header, rest) => extractPayload(rest)
}

const incrementGcmIv = (iv: Bytes): void => {
  // The final 8 bytes form a big-endian invocation counter.
  for (let i = iv.length - 1; i >= 4; i--) {
    iv[i] = (iv[i] + 1) & 0xff
    if (iv[i] !== 0) break
  }
}

/** @internal */
export interface DirectionKeys {
  readonly cipher: CipherAlgorithm
  readonly mac: MacAlgorithm | undefined
  readonly key: Bytes
  readonly iv: Bytes
  readonly macKey: Bytes | undefined
}

const importGcm = (crypto: Crypto.Crypto, key: Bytes, usage: Crypto.KeyUsage) =>
  Effect.mapError(
    crypto.importKey("raw", key, { name: "AES-GCM", length: key.length * 8 as 128 | 256 }, { usages: [usage] }),
    cryptoError("could not import AES-GCM key")
  )

const importMac = (crypto: Crypto.Crypto, mac: MacAlgorithm, key: Bytes) =>
  Effect.mapError(
    crypto.importKey("raw", key, { name: "HMAC", hash: mac.hash, length: key.length * 8 }, {
      usages: ["sign", "verify"]
    }),
    cryptoError("could not import MAC key")
  )

/** @internal */
export const makeSealer = Effect.fnUntraced(function*(crypto: Crypto.Crypto, keys: DirectionKeys) {
  const blockSize = keys.cipher.blockSize
  if (keys.cipher.mode === "gcm") {
    const key = yield* importGcm(crypto, keys.key, "encrypt")
    const iv = copy(keys.iv)
    return {
      seal: Effect.fnUntraced(function*(_sequence: number, payload: Uint8Array) {
        const { body, lengthBytes } = yield* buildPlaintext(crypto, payload, blockSize, false)
        const encrypted = yield* Effect.mapError(
          crypto.encrypt({ name: "AES-GCM", iv: copy(iv), additionalData: lengthBytes }, key, body),
          cryptoError("AES-GCM encryption failed")
        )
        incrementGcmIv(iv)
        return concat([lengthBytes, encrypted])
      })
    } satisfies Sealer
  }
  const mac = keys.mac!
  const ctr = yield* WebCrypto.aesCtr(keys.key, keys.iv)
  const macKey = yield* importMac(crypto, mac, keys.macKey!)
  const sign = (data: Uint8Array) =>
    Effect.mapError(crypto.sign({ name: "HMAC" }, macKey, data), cryptoError("MAC computation failed"))
  if (mac.etm) {
    return {
      seal: Effect.fnUntraced(function*(sequence: number, payload: Uint8Array) {
        const { body, lengthBytes } = yield* buildPlaintext(crypto, payload, blockSize, false)
        const encrypted = yield* ctr(body)
        const tag = yield* sign(concat([sequenceBytes(sequence), lengthBytes, encrypted]))
        return concat([lengthBytes, encrypted, tag])
      })
    } satisfies Sealer
  }
  return {
    seal: Effect.fnUntraced(function*(sequence: number, payload: Uint8Array) {
      const { body, lengthBytes } = yield* buildPlaintext(crypto, payload, blockSize, true)
      const plain = concat([lengthBytes, body])
      const tag = yield* sign(concat([sequenceBytes(sequence), plain]))
      return concat([yield* ctr(plain), tag])
    })
  } satisfies Sealer
})

/** @internal */
export const makeOpener = Effect.fnUntraced(function*(crypto: Crypto.Crypto, keys: DirectionKeys) {
  const blockSize = keys.cipher.blockSize
  if (keys.cipher.mode === "gcm") {
    const key = yield* importGcm(crypto, keys.key, "decrypt")
    const iv = copy(keys.iv)
    return {
      headerLength: 4,
      begin: (header) => {
        const length = readLength(header)
        return Effect.as(checkPacketLength(length, blockSize, length), length + 16)
      },
      finish: (_sequence, header, rest) =>
        crypto.decrypt({ name: "AES-GCM", iv: copy(iv), additionalData: header }, key, rest).pipe(
          Effect.mapError(macFailure),
          Effect.flatMap((plain) => {
            incrementGcmIv(iv)
            return extractPayload(plain)
          })
        )
    } satisfies Opener
  }
  const mac = keys.mac!
  const macLength = mac.keyLength
  const ctr = yield* WebCrypto.aesCtr(keys.key, keys.iv)
  const macKey = yield* importMac(crypto, mac, keys.macKey!)
  const verify = (tag: Uint8Array, data: Uint8Array) =>
    crypto.verify({ name: "HMAC" }, macKey, tag, data).pipe(
      Effect.mapError(cryptoError("MAC verification failed")),
      Effect.flatMap((valid) => valid ? Effect.void : Effect.fail(macFailure()))
    )
  if (mac.etm) {
    return {
      headerLength: 4,
      begin: (header) => {
        const length = readLength(header)
        return Effect.as(checkPacketLength(length, blockSize, length), length + macLength)
      },
      finish: Effect.fnUntraced(function*(sequence: number, header: Bytes, rest: Bytes) {
        const encrypted = rest.subarray(0, rest.length - macLength)
        yield* verify(rest.subarray(rest.length - macLength), concat([sequenceBytes(sequence), header, encrypted]))
        return yield* extractPayload(yield* ctr(encrypted))
      })
    } satisfies Opener
  }
  let firstBlock: Bytes | undefined
  return {
    headerLength: blockSize,
    begin: Effect.fnUntraced(function*(header: Bytes) {
      firstBlock = yield* ctr(header)
      const length = readLength(firstBlock)
      yield* checkPacketLength(length, blockSize, length + 4)
      return length + 4 - blockSize + macLength
    }),
    finish: Effect.fnUntraced(function*(sequence: number, _header: Bytes, rest: Bytes) {
      const plain = concat([firstBlock!, yield* ctr(rest.subarray(0, rest.length - macLength))])
      firstBlock = undefined
      yield* verify(rest.subarray(rest.length - macLength), concat([sequenceBytes(sequence), plain]))
      return yield* extractPayload(plain.subarray(4))
    })
  } satisfies Opener
})
