/**
 * SSH public and private keys backed by WebCrypto.
 *
 * Private keys are parsed from unencrypted OpenSSH (`openssh-key-v1`),
 * PKCS#8, PKCS#1 (RSA), and SEC1 (EC) PEM files, or generated in memory.
 * Supported key types are `ssh-ed25519`, `ecdsa-sha2-nistp256`,
 * `ecdsa-sha2-nistp384`, `ecdsa-sha2-nistp521`, and `ssh-rsa` (signing with
 * `rsa-sha2-256` / `rsa-sha2-512`). Imported private key material is held in
 * non-extractable `CryptoKey`s.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Effect from "../Effect.ts"
import * as Base64 from "../encoding/Base64.ts"
import * as Base64Url from "../encoding/Base64Url.ts"
import * as Inspectable from "../Inspectable.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as Crypto from "./internal/crypto.ts"
import * as Der from "./internal/der.ts"
import {
  bigIntToBytes,
  bytesToBigInt,
  copy,
  padStart,
  Reader,
  stripLeadingZeros,
  utf8,
  Writer
} from "./internal/wire.ts"
import { SshError, SshKeyError } from "./SshError.ts"

/**
 * Type identifier attached to `PublicKey` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export const PublicKeyTypeId = "~effect/ssh/SshKey/PublicKey"

/**
 * Type identifier attached to `PrivateKey` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export const PrivateKeyTypeId = "~effect/ssh/SshKey/PrivateKey"

/**
 * Key types that can be generated, parsed as private keys, and used for host
 * key verification.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type KeyType =
  | "ssh-ed25519"
  | "ecdsa-sha2-nistp256"
  | "ecdsa-sha2-nistp384"
  | "ecdsa-sha2-nistp521"
  | "ssh-rsa"

/**
 * An SSH public key in wire (`blob`) form.
 *
 * **Details**
 *
 * `type` is the key type encoded in the blob, which may be a type this module
 * cannot verify (for example a security-key or certificate type returned by
 * an agent). Such keys can still be offered for authentication through an
 * agent that holds the private half.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PublicKey extends Inspectable.Inspectable {
  readonly [PublicKeyTypeId]: typeof PublicKeyTypeId
  readonly type: string
  readonly blob: Uint8Array
  readonly comment: string
}

/**
 * Something that can produce SSH signatures for a public key, such as a
 * `PrivateKey` or an identity held by an SSH agent.
 *
 * **Details**
 *
 * `sign` returns a complete SSH signature blob
 * (`string algorithm, string signature`) for the requested signature
 * algorithm, which must be one of `signatureAlgorithms(publicKey.type)`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Signer {
  readonly publicKey: PublicKey
  readonly sign: (data: Uint8Array, algorithm: string) => Effect.Effect<Uint8Array, SshError>
}

/**
 * An SSH private key whose secret material is held by WebCrypto.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PrivateKey extends Signer, Inspectable.Inspectable {
  readonly [PrivateKeyTypeId]: typeof PrivateKeyTypeId
  readonly type: KeyType
}

/**
 * Returns `true` when a value is a `PublicKey`.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isPublicKey = (u: unknown): u is PublicKey => Predicate.hasProperty(u, PublicKeyTypeId)

/**
 * Returns `true` when a value is a `PrivateKey`.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isPrivateKey = (u: unknown): u is PrivateKey => Predicate.hasProperty(u, PrivateKeyTypeId)

const keyError = (description: string, cause?: unknown) =>
  new SshError({ reason: new SshKeyError({ description, cause }) })

const PublicKeyProto = {
  [PublicKeyTypeId]: PublicKeyTypeId,
  ...Inspectable.BaseProto,
  toJSON(this: PublicKey) {
    return { _id: "PublicKey", type: this.type, comment: this.comment }
  }
}

/**
 * Creates a `PublicKey` from its SSH wire blob.
 *
 * **Gotchas**
 *
 * Fails with an `SshKeyError` when the blob does not start with a key type
 * string.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromBlob = (blob: Uint8Array, comment = ""): Result.Result<PublicKey, SshError> => {
  try {
    const type = new Reader(blob).utf8()
    if (type.length === 0) return Result.fail(keyError("empty key type"))
    return Result.succeed(makePublicKeyUnsafe(type, copy(blob), comment))
  } catch (cause) {
    return Result.fail(keyError("invalid public key blob", cause))
  }
}

const makePublicKeyUnsafe = (type: string, blob: Uint8Array, comment: string): PublicKey =>
  Object.assign(Object.create(PublicKeyProto), { type, blob, comment })

/**
 * Returns `true` when two public keys have the same wire blob.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.0.0
 */
export const equals = (self: PublicKey, that: PublicKey): boolean => {
  if (self.blob.length !== that.blob.length) return false
  for (let i = 0; i < self.blob.length; i++) {
    if (self.blob[i] !== that.blob[i]) return false
  }
  return true
}

/**
 * Parses a public key in OpenSSH text form (`type base64 [comment]`), as found
 * in `*.pub` files and `authorized_keys`.
 *
 * **Details**
 *
 * Leading `authorized_keys` options are skipped: the first token that is
 * followed by a base64 blob encoding the same key type is used.
 *
 * @stability experimental
 * @category decoding
 * @since 4.0.0
 */
export const parsePublicKey = (text: string): Result.Result<PublicKey, SshError> => {
  const tokens = text.trim().split(/\s+/)
  for (let i = 0; i + 1 < tokens.length; i++) {
    const decoded = Base64.decode(tokens[i + 1])
    if (Result.isFailure(decoded)) continue
    const key = fromBlob(decoded.success, tokens.slice(i + 2).join(" "))
    if (Result.isSuccess(key) && key.success.type === tokens[i]) {
      return key
    }
  }
  return Result.fail(keyError("no public key found"))
}

/**
 * Formats a public key in OpenSSH text form (`type base64 [comment]`).
 *
 * @stability experimental
 * @category encoding
 * @since 4.0.0
 */
export const formatPublicKey = (key: PublicKey): string =>
  `${key.type} ${Base64.encode(key.blob)}${key.comment ? ` ${key.comment}` : ""}`

/**
 * Computes the OpenSSH `SHA256:` fingerprint of a public key, as printed by
 * `ssh-keygen -l`.
 *
 * @stability experimental
 * @category getters
 * @since 4.0.0
 */
export const fingerprint = (key: PublicKey): Effect.Effect<string> =>
  Effect.promise(() => Crypto.fingerprintSha256(key.blob))

/**
 * Returns the signature algorithms this module supports for a key type, in
 * preference order.
 *
 * @stability experimental
 * @category getters
 * @since 4.0.0
 */
export const signatureAlgorithms = (keyType: string): ReadonlyArray<string> =>
  Crypto.signatureAlgorithmsForKeyType(keyType)

/**
 * Verifies an SSH signature blob produced for `data` by the private half of
 * `key`.
 *
 * **Details**
 *
 * Succeeds with `false` for invalid signatures and fails with an
 * `SshKeyError` when the key or signature cannot be decoded or uses an
 * unsupported algorithm.
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const verify = (
  key: PublicKey,
  data: Uint8Array,
  signature: Uint8Array
): Effect.Effect<boolean, SshError> =>
  Effect.tryPromise({
    try: () => Crypto.verifySignature({ publicKey: key.blob, signature, data: copy(data) }),
    catch: (cause) => keyError("could not verify signature", cause)
  })

// -----------------------------------------------------------------------------
// Private keys
// -----------------------------------------------------------------------------

type PrivateJwk = JsonWebKey & { readonly kty: string }

const PrivateKeyProto = {
  [PrivateKeyTypeId]: PrivateKeyTypeId,
  ...Inspectable.BaseProto,
  toJSON(this: PrivateKey) {
    return { _id: "PrivateKey", type: this.type, comment: this.publicKey.comment }
  }
}

const decodeB64Url = (value: string | undefined, name: string): Uint8Array => {
  if (value === undefined) throw new Error(`missing JWK member ${name}`)
  const decoded = Base64Url.decode(value)
  if (Result.isFailure(decoded)) throw new Error(`invalid JWK member ${name}`)
  return decoded.success
}

const curveForJwk: Record<string, string> = {
  "P-256": "ecdsa-sha2-nistp256",
  "P-384": "ecdsa-sha2-nistp384",
  "P-521": "ecdsa-sha2-nistp521"
}

const fromJwk = async (jwk: PrivateJwk, comment: string): Promise<PrivateKey> => {
  const subtle = Crypto.subtle()
  // `alg` pins RSA keys to a single hash, so it is dropped to allow importing
  // one key per signature algorithm.
  const { alg: _alg, ...material } = jwk
  const importJwk = (algorithm: AlgorithmIdentifier | EcKeyImportParams | RsaHashedImportParams) =>
    subtle.importKey("jwk", { ...material, ext: false, key_ops: ["sign"] }, algorithm, false, ["sign"])

  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") {
    const publicKey = decodeB64Url(jwk.x, "x")
    const blob = new Writer().string("ssh-ed25519").string(publicKey).finish()
    const key = await importJwk({ name: "Ed25519" })
    return makePrivateKey("ssh-ed25519", blob, comment, async (data, algorithm) => {
      if (algorithm !== "ssh-ed25519") throw new Error(`unsupported signature algorithm ${algorithm}`)
      const signature = new Uint8Array(await subtle.sign("Ed25519", key, data))
      return new Writer().string(algorithm).string(signature).finish()
    })
  }

  if (jwk.kty === "EC" && jwk.crv !== undefined && jwk.crv in curveForJwk) {
    const type = curveForJwk[jwk.crv] as KeyType
    const curve = Crypto.ecdsaCurves[type]
    const x = padStart(decodeB64Url(jwk.x, "x"), curve.size)
    const y = padStart(decodeB64Url(jwk.y, "y"), curve.size)
    const point = new Uint8Array(1 + curve.size * 2)
    point[0] = 4
    point.set(x, 1)
    point.set(y, 1 + curve.size)
    const blob = new Writer().string(type).string(curve.identifier).string(point).finish()
    const key = await importJwk({ name: "ECDSA", namedCurve: curve.namedCurve })
    return makePrivateKey(type, blob, comment, async (data, algorithm) => {
      if (algorithm !== type) throw new Error(`unsupported signature algorithm ${algorithm}`)
      const signature = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: curve.hash }, key, data))
      return new Writer().string(algorithm).string(Crypto.ecdsaP1363ToSsh(signature)).finish()
    })
  }

  if (jwk.kty === "RSA") {
    const n = decodeB64Url(jwk.n, "n")
    const e = decodeB64Url(jwk.e, "e")
    const blob = new Writer().string("ssh-rsa").mpint(e).mpint(n).finish()
    const modulusLength = stripLeadingZeros(n).length
    const keys = {
      "rsa-sha2-256": await importJwk({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }),
      "rsa-sha2-512": await importJwk({ name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" })
    }
    return makePrivateKey("ssh-rsa", blob, comment, async (data, algorithm) => {
      const key = keys[algorithm as keyof typeof keys]
      if (key === undefined) throw new Error(`unsupported signature algorithm ${algorithm}`)
      const signature = new Uint8Array(await subtle.sign("RSASSA-PKCS1-v1_5", key, data))
      return new Writer().string(algorithm).string(padStart(signature, modulusLength)).finish()
    })
  }

  throw new Error(`unsupported key type ${jwk.kty}${jwk.crv ? ` (${jwk.crv})` : ""}`)
}

const makePrivateKey = (
  type: KeyType,
  blob: Uint8Array,
  comment: string,
  sign: (data: Uint8Array<ArrayBuffer>, algorithm: string) => Promise<Uint8Array>
): PrivateKey => {
  const publicKey = makePublicKeyUnsafe(type, blob, comment)
  return Object.assign(Object.create(PrivateKeyProto), {
    type,
    publicKey,
    sign: (data: Uint8Array, algorithm: string) =>
      Effect.tryPromise({
        try: () => sign(copy(data), algorithm),
        catch: (cause) => keyError(`could not sign with ${algorithm}`, cause)
      })
  })
}

const b64u = (bytes: Uint8Array): string => Base64Url.encode(stripLeadingZeros(bytes))

const parseOpenSshPrivateKey = async (data: Uint8Array): Promise<PrivateKey> => {
  const magic = utf8("openssh-key-v1\0")
  for (let i = 0; i < magic.length; i++) {
    if (data[i] !== magic[i]) throw new Error("invalid OpenSSH private key magic")
  }
  const reader = new Reader(data, magic.length)
  const cipher = reader.utf8()
  const kdf = reader.utf8()
  reader.string()
  if (cipher !== "none" || kdf !== "none") {
    throw new UnsupportedKeyError(`encrypted OpenSSH private keys are not supported (${cipher}/${kdf})`)
  }
  const count = reader.uint32()
  if (count !== 1) throw new Error(`expected exactly one key, found ${count}`)
  reader.string()
  const section = new Reader(reader.string())
  if (section.uint32() !== section.uint32()) throw new Error("corrupt OpenSSH private key (check mismatch)")
  const type = section.utf8()
  switch (type) {
    case "ssh-ed25519": {
      const publicKey = section.string()
      const secret = section.string()
      const comment = section.utf8()
      return fromJwk({
        kty: "OKP",
        crv: "Ed25519",
        x: Base64Url.encode(publicKey),
        d: Base64Url.encode(secret.subarray(0, 32))
      }, comment)
    }
    case "ecdsa-sha2-nistp256":
    case "ecdsa-sha2-nistp384":
    case "ecdsa-sha2-nistp521": {
      const curve = Crypto.ecdsaCurves[type]
      section.utf8()
      const point = section.string()
      const d = section.mpint()
      const comment = section.utf8()
      if (point[0] !== 4 || point.length !== 1 + curve.size * 2) throw new Error("invalid EC public point")
      return fromJwk({
        kty: "EC",
        crv: curve.namedCurve,
        x: Base64Url.encode(point.subarray(1, 1 + curve.size)),
        y: Base64Url.encode(point.subarray(1 + curve.size)),
        d: Base64Url.encode(padStart(d, curve.size))
      }, comment)
    }
    case "ssh-rsa": {
      const n = section.mpint()
      const e = section.mpint()
      const d = section.mpint()
      const iqmp = section.mpint()
      const p = section.mpint()
      const q = section.mpint()
      const comment = section.utf8()
      const dBig = bytesToBigInt(d)
      const one = BigInt(1)
      return fromJwk({
        kty: "RSA",
        n: b64u(n),
        e: b64u(e),
        d: b64u(d),
        p: b64u(p),
        q: b64u(q),
        dp: b64u(bigIntToBytes(dBig % (bytesToBigInt(p) - one))),
        dq: b64u(bigIntToBytes(dBig % (bytesToBigInt(q) - one))),
        qi: b64u(iqmp)
      }, comment)
    }
    default:
      throw new UnsupportedKeyError(`unsupported key type ${type}`)
  }
}

class UnsupportedKeyError extends Error {}

const importPkcs8 = async (der: Uint8Array<ArrayBuffer>, comment: string): Promise<PrivateKey> => {
  const [, algorithm] = Der.children(Der.read(der).value)
  const [oid, params] = Der.children(algorithm.value)
  const algorithmOid = Der.decodeOid(oid.value)
  const subtle = Crypto.subtle()
  let importParams: AlgorithmIdentifier | EcKeyImportParams | RsaHashedImportParams
  if (algorithmOid === Der.OID_ED25519) {
    importParams = { name: "Ed25519" }
  } else if (algorithmOid === Der.OID_EC_PUBLIC_KEY) {
    const namedCurve = params !== undefined ? Der.curveOids[Der.decodeOid(params.value)] : undefined
    if (namedCurve === undefined) throw new UnsupportedKeyError("unsupported EC curve")
    importParams = { name: "ECDSA", namedCurve }
  } else if (algorithmOid === Der.OID_RSA_ENCRYPTION) {
    importParams = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
  } else {
    throw new UnsupportedKeyError(`unsupported PKCS#8 key algorithm ${algorithmOid}`)
  }
  const extractable = await subtle.importKey("pkcs8", der, importParams, true, ["sign"])
  const jwk = await subtle.exportKey("jwk", extractable) as PrivateJwk
  return fromJwk(jwk, comment)
}

const wrapPkcs8 = (algorithm: Uint8Array, privateKey: Uint8Array): Uint8Array<ArrayBuffer> =>
  Der.sequence(
    Der.encode(Der.TAG_INTEGER, new Uint8Array([0])),
    algorithm,
    Der.encode(Der.TAG_OCTET_STRING, privateKey)
  )

const wrapPkcs1 = (der: Uint8Array) =>
  wrapPkcs8(
    Der.sequence(
      Der.encode(Der.TAG_OID, Der.encodeOid(Der.OID_RSA_ENCRYPTION)),
      Der.encode(Der.TAG_NULL, new Uint8Array(0))
    ),
    der
  )

const wrapSec1 = (der: Uint8Array) => {
  const fields = Der.children(Der.read(der).value)
  const parameters = fields.find((field) => field.tag === 0xa0)
  if (parameters === undefined) throw new UnsupportedKeyError("SEC1 key without curve parameters")
  const curve = Der.read(parameters.value)
  return wrapPkcs8(
    Der.sequence(
      Der.encode(Der.TAG_OID, Der.encodeOid(Der.OID_EC_PUBLIC_KEY)),
      Der.encode(Der.TAG_OID, curve.value)
    ),
    der
  )
}

interface Pem {
  readonly label: string
  readonly headers: ReadonlyMap<string, string>
  readonly body: Uint8Array
}

const parsePem = (text: string): Pem | undefined => {
  const match = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(text)
  if (match === null) return undefined
  const headers = new Map<string, string>()
  const lines = match[2].split(/\r?\n/)
  const bodyLines: Array<string> = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    // RFC 1421 headers (such as `Proc-Type`) precede the base64 body.
    const header = /^([A-Za-z-]+):\s*(.*)$/.exec(trimmed)
    if (header !== null && bodyLines.length === 0) {
      headers.set(header[1], header[2])
    } else {
      bodyLines.push(trimmed)
    }
  }
  const decoded = Base64.decode(bodyLines.join(""))
  if (Result.isFailure(decoded)) throw new Error(`invalid base64 in ${match[1]}`)
  return { label: match[1], headers, body: decoded.success }
}

/**
 * Parses an unencrypted private key file.
 *
 * **Details**
 *
 * Accepts `OPENSSH PRIVATE KEY`, `PRIVATE KEY` (PKCS#8), `RSA PRIVATE KEY`
 * (PKCS#1), and `EC PRIVATE KEY` (SEC1) PEM blocks, as text or UTF-8 bytes.
 * The comment of OpenSSH keys is preserved; `options.comment` overrides it.
 *
 * **Gotchas**
 *
 * Passphrase-protected keys fail with an `SshKeyError`; decrypt them first
 * (for example with `ssh-keygen -p`) or load them into an SSH agent.
 *
 * @stability experimental
 * @category decoding
 * @since 4.0.0
 */
export const parsePrivateKey = (
  input: string | Uint8Array,
  options?: { readonly comment?: string | undefined }
): Effect.Effect<PrivateKey, SshError> =>
  Effect.tryPromise({
    try: async () => {
      const text = typeof input === "string" ? input : new TextDecoder().decode(input)
      const pem = parsePem(text)
      if (pem === undefined) throw new Error("no PEM block found")
      if (pem.headers.get("Proc-Type")?.includes("ENCRYPTED") === true) {
        throw new UnsupportedKeyError("encrypted PEM private keys are not supported")
      }
      const body = copy(pem.body)
      let key: PrivateKey
      switch (pem.label) {
        case "OPENSSH PRIVATE KEY":
          key = await parseOpenSshPrivateKey(body)
          break
        case "PRIVATE KEY":
          key = await importPkcs8(body, "")
          break
        case "RSA PRIVATE KEY":
          key = await importPkcs8(wrapPkcs1(body), "")
          break
        case "EC PRIVATE KEY":
          key = await importPkcs8(wrapSec1(body), "")
          break
        case "ENCRYPTED PRIVATE KEY":
          throw new UnsupportedKeyError("encrypted PKCS#8 private keys are not supported")
        default:
          throw new UnsupportedKeyError(`unsupported PEM block ${pem.label}`)
      }
      return options?.comment !== undefined ? withComment(key, options.comment) : key
    },
    catch: (cause) =>
      cause instanceof UnsupportedKeyError
        ? keyError(cause.message)
        : keyError("could not parse private key", cause)
  })

const withComment = (key: PrivateKey, comment: string): PrivateKey =>
  Object.assign(Object.create(PrivateKeyProto), {
    type: key.type,
    publicKey: makePublicKeyUnsafe(key.publicKey.type, key.publicKey.blob, comment),
    sign: key.sign
  })

/**
 * Generates a new private key in memory.
 *
 * **Details**
 *
 * RSA keys default to 3072 bits. The generated key material is not
 * extractable after import.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const generate = (
  type: KeyType,
  options?: {
    readonly comment?: string | undefined
    readonly bits?: number | undefined
  }
): Effect.Effect<PrivateKey, SshError> =>
  Effect.tryPromise({
    try: async () => {
      const subtle = Crypto.subtle()
      let algorithm: AlgorithmIdentifier | EcKeyGenParams | RsaHashedKeyGenParams
      if (type === "ssh-ed25519") {
        algorithm = { name: "Ed25519" }
      } else if (type === "ssh-rsa") {
        algorithm = {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: options?.bits ?? 3072,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256"
        }
      } else {
        algorithm = { name: "ECDSA", namedCurve: Crypto.ecdsaCurves[type].namedCurve }
      }
      const pair = await subtle.generateKey(algorithm, true, ["sign", "verify"]) as CryptoKeyPair
      const jwk = await subtle.exportKey("jwk", pair.privateKey) as PrivateJwk
      return fromJwk(jwk, options?.comment ?? "")
    },
    catch: (cause) => keyError(`could not generate ${type} key`, cause)
  })
