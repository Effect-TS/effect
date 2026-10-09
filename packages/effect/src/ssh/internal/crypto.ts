/**
 * WebCrypto-backed SSH cryptography: key exchange, host key signature
 * verification, packet protection and key derivation.
 *
 * @internal
 */
import * as Base64Url from "../../encoding/Base64Url.ts"
import type { Bytes } from "./wire.ts"
import { concat, padStart, Reader, stripLeadingZeros, utf8, WireError, Writer } from "./wire.ts"

/** @internal */
export type HashName = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

/** @internal */
export class CryptoUnavailableError extends Error {}

/** @internal */
export const webCrypto = (): Crypto => {
  const crypto = globalThis.crypto
  if (crypto === undefined || crypto.subtle === undefined) {
    throw new CryptoUnavailableError("globalThis.crypto.subtle is not available")
  }
  return crypto
}

/** @internal */
export const subtle = (): SubtleCrypto => webCrypto().subtle

/** @internal */
export const randomBytes = (size: number): Bytes => {
  const out = new Uint8Array(size)
  const crypto = webCrypto()
  for (let offset = 0; offset < size; offset += 65536) {
    crypto.getRandomValues(out.subarray(offset, Math.min(size, offset + 65536)))
  }
  return out
}

/** @internal */
export const digest = async (hash: HashName, data: Bytes): Promise<Bytes> =>
  new Uint8Array(await subtle().digest(hash, data))

/** @internal */
export const hmac = async (hash: HashName, key: Bytes, data: Bytes): Promise<Bytes> => {
  const cryptoKey = await subtle().importKey("raw", key, { name: "HMAC", hash }, false, ["sign"])
  return new Uint8Array(await subtle().sign("HMAC", cryptoKey, data))
}

/** @internal */
export const base64Url = (bytes: Uint8Array): string => Base64Url.encode(bytes)

// -----------------------------------------------------------------------------
// Key exchange
// -----------------------------------------------------------------------------

/** @internal */
export interface KexKeyPair {
  readonly publicKey: Bytes
  /**
   * Computes the shared secret as an unsigned big-endian magnitude.
   */
  readonly agree: (peerPublicKey: Uint8Array) => Promise<Bytes>
}

/** @internal */
export interface KexMethod {
  readonly name: string
  readonly hash: HashName
  readonly generate: () => Promise<KexKeyPair>
}

const x25519 = (name: string): KexMethod => ({
  name,
  hash: "SHA-256",
  generate: async () => {
    const pair = await subtle().generateKey({ name: "X25519" }, true, ["deriveBits"]) as CryptoKeyPair
    const publicKey = new Uint8Array(await subtle().exportKey("raw", pair.publicKey))
    return {
      publicKey,
      agree: async (peer) => {
        if (peer.length !== 32) {
          throw new WireError("invalid curve25519 public key length")
        }
        const peerKey = await subtle().importKey("raw", copyBytes(peer), { name: "X25519" }, false, [])
        const secret = new Uint8Array(
          await subtle().deriveBits({ name: "X25519", public: peerKey }, pair.privateKey, 256)
        )
        let nonZero = 0
        for (let i = 0; i < secret.length; i++) nonZero |= secret[i]
        if (nonZero === 0) {
          throw new WireError("curve25519 shared secret is zero")
        }
        return secret
      }
    }
  }
})

const ecdh = (name: string, namedCurve: string, hash: HashName): KexMethod => ({
  name,
  hash,
  generate: async () => {
    const pair = await subtle().generateKey({ name: "ECDH", namedCurve }, true, ["deriveBits"]) as CryptoKeyPair
    const publicKey = new Uint8Array(await subtle().exportKey("raw", pair.publicKey))
    return {
      publicKey,
      agree: async (peer) => {
        const peerKey = await subtle().importKey("raw", copyBytes(peer), { name: "ECDH", namedCurve }, false, [])
        return new Uint8Array(
          await subtle().deriveBits({ name: "ECDH", public: peerKey }, pair.privateKey, curveBits[namedCurve])
        )
      }
    }
  }
})

const curveBits: Record<string, number> = { "P-256": 256, "P-384": 384, "P-521": 528 }

/** @internal */
export const kexMethods: Record<string, KexMethod> = {
  "curve25519-sha256": x25519("curve25519-sha256"),
  "curve25519-sha256@libssh.org": x25519("curve25519-sha256@libssh.org"),
  "ecdh-sha2-nistp256": ecdh("ecdh-sha2-nistp256", "P-256", "SHA-256"),
  "ecdh-sha2-nistp384": ecdh("ecdh-sha2-nistp384", "P-384", "SHA-384"),
  "ecdh-sha2-nistp521": ecdh("ecdh-sha2-nistp521", "P-521", "SHA-512")
}

/** @internal */
export const deriveKey = async (
  hash: HashName,
  sharedSecret: Bytes,
  exchangeHash: Bytes,
  letter: string,
  sessionId: Bytes,
  length: number
): Promise<Bytes> => {
  const k = new Writer().mpint(sharedSecret).finish()
  let out = await digest(hash, concat([k, exchangeHash, utf8(letter), sessionId]))
  while (out.length < length) {
    out = concat([out, await digest(hash, concat([k, exchangeHash, out]))])
  }
  return out.subarray(0, length)
}

// -----------------------------------------------------------------------------
// Public key signatures
// -----------------------------------------------------------------------------

const copyBytes = (bytes: Uint8Array): Bytes => {
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out
}

/** @internal */
export interface EcdsaCurve {
  readonly identifier: string
  readonly namedCurve: string
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
 * Converts a WebCrypto IEEE P1363 ECDSA signature (`r || s`) into the SSH
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
 * Imports the verification key for a public key blob.
 *
 * @internal
 */
export const importVerifyKey = async (blob: Uint8Array, algorithm: string): Promise<CryptoKey> => {
  const reader = new Reader(blob)
  const keyType = reader.utf8()
  if (keyType !== keyTypeForSignatureAlgorithm(algorithm)) {
    throw new WireError(`key type ${keyType} does not match signature algorithm ${algorithm}`)
  }
  if (keyType === "ssh-ed25519") {
    const key = reader.string()
    if (key.length !== 32) throw new WireError("invalid ed25519 public key")
    return subtle().importKey("raw", copyBytes(key), { name: "Ed25519" }, false, ["verify"])
  }
  const curve = ecdsaCurves[keyType]
  if (curve !== undefined) {
    const identifier = reader.utf8()
    if (identifier !== curve.identifier) throw new WireError("ecdsa curve mismatch")
    const point = reader.string()
    return subtle().importKey("raw", copyBytes(point), { name: "ECDSA", namedCurve: curve.namedCurve }, false, [
      "verify"
    ])
  }
  const rsaHash = rsaSignatureHashes[algorithm]
  if (keyType === "ssh-rsa" && rsaHash !== undefined) {
    const e = reader.mpint()
    const n = reader.mpint()
    return subtle().importKey(
      "jwk",
      { kty: "RSA", e: base64Url(stripLeadingZeros(e)), n: base64Url(stripLeadingZeros(n)), ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: rsaHash },
      false,
      ["verify"]
    )
  }
  throw new WireError(`unsupported public key algorithm ${algorithm}`)
}

/**
 * Returns the RSA modulus length in bytes for an `ssh-rsa` key blob.
 */
const rsaModulusLength = (blob: Uint8Array): number => {
  const reader = new Reader(blob)
  reader.string()
  reader.mpint()
  return stripLeadingZeros(reader.mpint()).length
}

/**
 * Verifies an SSH signature blob (`string algorithm, string signature`)
 * against a public key blob. When `expectedAlgorithm` is provided, the
 * signature must use exactly that algorithm.
 *
 * @internal
 */
export const verifySignature = async (options: {
  readonly publicKey: Uint8Array
  readonly signature: Uint8Array
  readonly data: Bytes
  readonly expectedAlgorithm?: string | undefined
}): Promise<boolean> => {
  const sigReader = new Reader(options.signature)
  const algorithm = sigReader.utf8()
  const signature = sigReader.string()
  if (options.expectedAlgorithm !== undefined && algorithm !== options.expectedAlgorithm) {
    return false
  }
  const key = await importVerifyKey(options.publicKey, algorithm)
  if (algorithm === "ssh-ed25519") {
    return subtle().verify("Ed25519", key, copyBytes(signature), options.data)
  }
  const curve = ecdsaCurves[algorithm]
  if (curve !== undefined) {
    return subtle().verify(
      { name: "ECDSA", hash: curve.hash },
      key,
      ecdsaSshToP1363(signature, curve.size),
      options.data
    )
  }
  const length = rsaModulusLength(options.publicKey)
  if (signature.length > length) return false
  return subtle().verify("RSASSA-PKCS1-v1_5", key, padStart(signature, length), options.data)
}

/** @internal */
export const fingerprintSha256 = async (blob: Uint8Array): Promise<string> => {
  const hash = await digest("SHA-256", copyBytes(blob))
  return "SHA256:" + base64NoPad(hash)
}

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
export class MacError extends Error {}

/** @internal */
export const MAX_PACKET_LENGTH = 256 * 1024

/**
 * Seals outgoing payloads into complete wire packets.
 *
 * @internal
 */
export interface Sealer {
  readonly seal: (sequence: number, payload: Uint8Array) => Promise<Bytes>
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
  readonly begin: (header: Bytes) => Promise<number>
  readonly finish: (sequence: number, header: Bytes, rest: Bytes) => Promise<Uint8Array>
}

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

const checkPacketLength = (length: number, blockSize: number, aligned: number): void => {
  if (length < 5 || length > MAX_PACKET_LENGTH || aligned % blockSize !== 0) {
    throw new WireError(`invalid packet length ${length}`)
  }
}

const extractPayload = (body: Uint8Array): Uint8Array => {
  const padding = body[0]
  if (padding < 4 || padding + 1 > body.length) {
    throw new WireError("invalid packet padding")
  }
  return body.subarray(1, body.length - padding)
}

/**
 * Builds `padding_length || payload || padding`, optionally prefixed with the
 * packet length.
 */
const buildPlaintext = (payload: Uint8Array, blockSize: number, lengthAligned: boolean): {
  readonly lengthBytes: Bytes
  readonly body: Bytes
} => {
  const padding = paddingFor(lengthAligned ? 5 + payload.length : 1 + payload.length, blockSize)
  const body = new Uint8Array(1 + payload.length + padding)
  body[0] = padding
  body.set(payload, 1)
  globalThis.crypto.getRandomValues(body.subarray(1 + payload.length))
  const lengthBytes = new Uint8Array(4)
  new DataView(lengthBytes.buffer).setUint32(0, body.length)
  return { lengthBytes, body }
}

/** @internal */
export const noneSealer: Sealer = {
  seal: async (_sequence, payload) => {
    const { body, lengthBytes } = buildPlaintext(payload, 8, true)
    return concat([lengthBytes, body])
  }
}

/** @internal */
export const noneOpener: Opener = {
  headerLength: 4,
  begin: async (header) => {
    const length = readLength(header)
    if (length < 5 || length > MAX_PACKET_LENGTH) {
      throw new WireError(`invalid packet length ${length}`)
    }
    return length
  },
  finish: async (_sequence, _header, rest) => extractPayload(rest)
}

const incrementGcmIv = (iv: Bytes): void => {
  // The final 8 bytes form a big-endian invocation counter.
  for (let i = iv.length - 1; i >= 4; i--) {
    iv[i] = (iv[i] + 1) & 0xff
    if (iv[i] !== 0) break
  }
}

const addCounter = (counter: Bytes, blocks: number): void => {
  let carry = blocks
  for (let i = counter.length - 1; i >= 0 && carry > 0; i--) {
    const sum = counter[i] + (carry & 0xff)
    counter[i] = sum & 0xff
    carry = Math.floor(carry / 256) + (sum >> 8)
  }
}

const importAes = (name: "AES-GCM" | "AES-CTR", key: Bytes) =>
  subtle().importKey("raw", key, { name }, false, ["encrypt", "decrypt"])

const importHmac = (hash: HashName, key: Bytes) =>
  subtle().importKey("raw", key, { name: "HMAC", hash }, false, ["sign", "verify"])

const makeCtr = async (key: Bytes, iv: Bytes) => {
  const cryptoKey = await importAes("AES-CTR", key)
  const counter = new Uint8Array(iv)
  return async (data: Bytes): Promise<Bytes> => {
    if (data.length === 0) return data
    const current = new Uint8Array(counter)
    addCounter(counter, Math.ceil(data.length / 16))
    return new Uint8Array(await subtle().encrypt({ name: "AES-CTR", counter: current, length: 128 }, cryptoKey, data))
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

/** @internal */
export const makeSealer = async (keys: DirectionKeys): Promise<Sealer> => {
  const blockSize = keys.cipher.blockSize
  if (keys.cipher.mode === "gcm") {
    const cryptoKey = await importAes("AES-GCM", keys.key)
    const iv = new Uint8Array(keys.iv)
    return {
      seal: async (_sequence, payload) => {
        const { body, lengthBytes } = buildPlaintext(payload, blockSize, false)
        const encrypted = await subtle().encrypt(
          { name: "AES-GCM", iv: new Uint8Array(iv), additionalData: lengthBytes, tagLength: 128 },
          cryptoKey,
          body
        )
        incrementGcmIv(iv)
        return concat([lengthBytes, new Uint8Array(encrypted)])
      }
    }
  }
  const mac = keys.mac!
  const ctr = await makeCtr(keys.key, keys.iv)
  const macKey = await importHmac(mac.hash, keys.macKey!)
  const sign = async (data: Bytes) => new Uint8Array(await subtle().sign("HMAC", macKey, data))
  if (mac.etm) {
    return {
      seal: async (sequence, payload) => {
        const { body, lengthBytes } = buildPlaintext(payload, blockSize, false)
        const encrypted = await ctr(body)
        const tag = await sign(concat([sequenceBytes(sequence), lengthBytes, encrypted]))
        return concat([lengthBytes, encrypted, tag])
      }
    }
  }
  return {
    seal: async (sequence, payload) => {
      const { body, lengthBytes } = buildPlaintext(payload, blockSize, true)
      const plain = concat([lengthBytes, body])
      const tag = await sign(concat([sequenceBytes(sequence), plain]))
      const encrypted = await ctr(plain)
      return concat([encrypted, tag])
    }
  }
}

/** @internal */
export const makeOpener = async (keys: DirectionKeys): Promise<Opener> => {
  const blockSize = keys.cipher.blockSize
  if (keys.cipher.mode === "gcm") {
    const cryptoKey = await importAes("AES-GCM", keys.key)
    const iv = new Uint8Array(keys.iv)
    return {
      headerLength: 4,
      begin: async (header) => {
        const length = readLength(header)
        checkPacketLength(length, blockSize, length)
        return length + 16
      },
      finish: async (_sequence, header, rest) => {
        let plain: ArrayBuffer
        try {
          plain = await subtle().decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv), additionalData: header, tagLength: 128 },
            cryptoKey,
            rest
          )
        } catch {
          throw new MacError("message authentication failed")
        }
        incrementGcmIv(iv)
        return extractPayload(new Uint8Array(plain))
      }
    }
  }
  const mac = keys.mac!
  const macLength = mac.keyLength
  const ctr = await makeCtr(keys.key, keys.iv)
  const macKey = await importHmac(mac.hash, keys.macKey!)
  const verify = (tag: Bytes, data: Bytes) => subtle().verify("HMAC", macKey, tag, data)
  if (mac.etm) {
    return {
      headerLength: 4,
      begin: async (header) => {
        const length = readLength(header)
        checkPacketLength(length, blockSize, length)
        return length + macLength
      },
      finish: async (sequence, header, rest) => {
        const encrypted = rest.subarray(0, rest.length - macLength)
        const tag = rest.subarray(rest.length - macLength)
        if (!(await verify(tag, concat([sequenceBytes(sequence), header, encrypted])))) {
          throw new MacError("message authentication failed")
        }
        return extractPayload(await ctr(encrypted))
      }
    }
  }
  let firstBlock: Bytes | undefined
  return {
    headerLength: blockSize,
    begin: async (header) => {
      firstBlock = await ctr(header)
      const length = readLength(firstBlock)
      checkPacketLength(length, blockSize, length + 4)
      return length + 4 - blockSize + macLength
    },
    finish: async (sequence, _header, rest) => {
      const encrypted = rest.subarray(0, rest.length - macLength)
      const tag = rest.subarray(rest.length - macLength)
      const plain = concat([firstBlock!, await ctr(encrypted)])
      firstBlock = undefined
      if (!(await verify(tag, concat([sequenceBytes(sequence), plain])))) {
        throw new MacError("message authentication failed")
      }
      return extractPayload(plain.subarray(4))
    }
  }
}
