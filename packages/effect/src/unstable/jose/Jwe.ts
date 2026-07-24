/**
 * JSON Web Encryption (JWE) based on RFC 7516.
 *
 * This module provides the JWE Compact Serialization together with WebCrypto
 * backed authenticated encryption and decryption. It supports the AES-GCM and
 * AES-CBC-HMAC-SHA2 content encryption families and the `dir`, RSA-OAEP,
 * AES key wrap, AES-GCM key wrap, ECDH-ES (direct and key-wrap), and PBES2
 * key management families.
 *
 * `RSA1_5` key management is intentionally unsupported — the Web Crypto API
 * does not implement RSAES-PKCS1-v1_5 encryption and RFC 8725 discourages it.
 *
 * @since 4.0.0
 * @see https://www.rfc-editor.org/rfc/rfc7516 - JSON Web Encryption (JWE)
 * @see https://www.rfc-editor.org/rfc/rfc7518 - JSON Web Algorithms (JWA)
 */
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import { encryptionParameters, JweAlgorithm, JweEncryption } from "./Jwa.ts"
import { Jwk } from "./Jwk.ts"

const textEncoder = new TextEncoder()

/**
 * @internal
 * Copies bytes into a fresh `ArrayBuffer`-backed view so they satisfy the
 * `BufferSource` parameter type of the Web Crypto API (a `Uint8Array` may be
 * backed by a `SharedArrayBuffer`, which those signatures reject).
 */
const u8 = (data: Uint8Array): Uint8Array<ArrayBuffer> => Uint8Array.from(data)

/**
 * The JWE Protected Header (RFC 7516 Section 4). Carries the required `alg`
 * and `enc` parameters plus the optional shared and algorithm-specific
 * parameters, and is extensible with additional public/private parameters.
 *
 * @category Schema
 * @since 4.0.0
 */
export const ProtectedHeader = Schema.StructWithRest(
  Schema.Struct({
    /** @see https://www.rfc-editor.org/rfc/rfc7516#section-4.1.1 */
    alg: JweAlgorithm,

    /** @see https://www.rfc-editor.org/rfc/rfc7516#section-4.1.2 */
    enc: JweEncryption,

    /** @see https://www.rfc-editor.org/rfc/rfc7516#section-4.1.6 */
    kid: Schema.String.pipe(Schema.optional),

    /** @see https://www.rfc-editor.org/rfc/rfc7516#section-4.1.11 */
    typ: Schema.String.pipe(Schema.optional),

    /** @see https://www.rfc-editor.org/rfc/rfc7516#section-4.1.12 */
    cty: Schema.String.pipe(Schema.optional),

    /** Ephemeral public key for ECDH-ES. @see https://www.rfc-editor.org/rfc/rfc7518#section-4.6.1.1 */
    epk: Jwk.pipe(Schema.optional),

    /** Agreement PartyUInfo for ECDH-ES (base64url). @see https://www.rfc-editor.org/rfc/rfc7518#section-4.6.1.2 */
    apu: Schema.String.pipe(Schema.optional),

    /** Agreement PartyVInfo for ECDH-ES (base64url). @see https://www.rfc-editor.org/rfc/rfc7518#section-4.6.1.3 */
    apv: Schema.String.pipe(Schema.optional),

    /** Initialization Vector for AES-GCM key wrap (base64url). @see https://www.rfc-editor.org/rfc/rfc7518#section-4.7.1.1 */
    iv: Schema.String.pipe(Schema.optional),

    /** Authentication Tag for AES-GCM key wrap (base64url). @see https://www.rfc-editor.org/rfc/rfc7518#section-4.7.1.2 */
    tag: Schema.String.pipe(Schema.optional),

    /** PBES2 Salt Input (base64url). @see https://www.rfc-editor.org/rfc/rfc7518#section-4.8.1.1 */
    p2s: Schema.String.pipe(Schema.optional),

    /** PBES2 iteration Count. @see https://www.rfc-editor.org/rfc/rfc7518#section-4.8.1.2 */
    p2c: Schema.Number.pipe(Schema.optional)
  }),
  [Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Unknown))]
).annotate({
  title: "JWE Protected Header",
  description: "The integrity-protected JWE header as defined in RFC 7516 Section 4"
})

/**
 * The parsed parts of a JWE Compact Serialization (RFC 7516 Section 7.1):
 *
 *     BASE64URL(UTF8(Protected Header)) . BASE64URL(Encrypted Key) .
 *     BASE64URL(IV) . BASE64URL(Ciphertext) . BASE64URL(Authentication Tag)
 *
 * @category Schema
 * @since 4.0.0
 */
export const Compact = Schema.TemplateLiteralParser([
  Schema.String,
  Schema.Literal("."),
  Schema.String,
  Schema.Literal("."),
  Schema.String,
  Schema.Literal("."),
  Schema.String,
  Schema.Literal("."),
  Schema.String
]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      protected: Schema.String,
      encryptedKey: Schema.String,
      iv: Schema.String,
      ciphertext: Schema.String,
      tag: Schema.String
    }),
    {
      decode: SchemaGetter.transform((parts) => ({
        protected: parts[0],
        encryptedKey: parts[2],
        iv: parts[4],
        ciphertext: parts[6],
        tag: parts[8]
      })),
      encode: SchemaGetter.transform((parts) =>
        [parts.protected, ".", parts.encryptedKey, ".", parts.iv, ".", parts.ciphertext, ".", parts.tag] as const
      )
    }
  )
)

/**
 * The reasons a JWE operation can fail.
 *
 * @category Errors
 * @since 4.0.0
 */
export type JweErrorReason =
  | "Malformed"
  | "UnsupportedAlgorithm"
  | "KeyManagementFailed"
  | "DecryptionFailed"

/**
 * @category Errors
 * @since 4.0.0
 */
export class JweError extends Data.TaggedError("JweError")<{
  readonly reason: JweErrorReason
  readonly cause?: unknown
}> {}

/** @internal Encodes bytes as an unpadded base64url string. */
const base64Url = (bytes: Uint8Array): string => {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

/** @internal Decodes an unpadded base64url string to bytes. */
const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** @internal */
const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length))

/** @internal */
const concatBytes = (...arrays: ReadonlyArray<Uint8Array>): Uint8Array => {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

/** @internal 64-bit big-endian encoding of a bit length. */
const uint64BE = (value: number): Uint8Array => {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, BigInt(value), false)
  return out
}

/** @internal Constant-time byte comparison (length is not treated as secret). */
const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const die = (reason: JweErrorReason) => (cause: unknown) => new JweError({ reason, cause })

// -------------------------------------------------------------------------------------
// Content encryption
// -------------------------------------------------------------------------------------

type EncParams = ReturnType<typeof encryptionParameters>

const contentEncrypt = Effect.fnUntraced(function*(
  params: EncParams,
  cek: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array
) {
  if (params.kind === "gcm") {
    const key = yield* Effect.promise(() => crypto.subtle.importKey("raw", u8(cek), "AES-GCM", false, ["encrypt"]))
    const combined = new Uint8Array(
      yield* Effect.promise(() =>
        crypto.subtle.encrypt(
          { name: "AES-GCM", iv: u8(iv), additionalData: u8(aad), tagLength: 128 },
          key,
          u8(plaintext)
        )
      )
    )
    return { ciphertext: combined.slice(0, -16), tag: combined.slice(-16) }
  }

  const macKey = cek.slice(0, params.macBytes)
  const encKey = cek.slice(params.macBytes)
  const aesKey = yield* Effect.promise(() => crypto.subtle.importKey("raw", u8(encKey), "AES-CBC", false, ["encrypt"]))
  const ciphertext = new Uint8Array(
    yield* Effect.promise(() => crypto.subtle.encrypt({ name: "AES-CBC", iv: u8(iv) }, aesKey, u8(plaintext)))
  )
  const macInput = concatBytes(aad, iv, ciphertext, uint64BE(aad.length * 8))
  const hmacKey = yield* Effect.promise(() =>
    crypto.subtle.importKey("raw", u8(macKey), { name: "HMAC", hash: params.hash }, false, ["sign"])
  )
  const mac = new Uint8Array(yield* Effect.promise(() => crypto.subtle.sign("HMAC", hmacKey, u8(macInput))))
  return { ciphertext, tag: mac.slice(0, params.tagBytes) }
})

const contentDecrypt = Effect.fnUntraced(function*(
  params: EncParams,
  cek: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array
) {
  if (params.kind === "gcm") {
    const key = yield* Effect.promise(() => crypto.subtle.importKey("raw", u8(cek), "AES-GCM", false, ["decrypt"]))
    const plaintext = yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.decrypt(
          { name: "AES-GCM", iv: u8(iv), additionalData: u8(aad), tagLength: 128 },
          key,
          u8(concatBytes(ciphertext, tag))
        ),
      catch: die("DecryptionFailed")
    })
    return new Uint8Array(plaintext)
  }

  const macKey = cek.slice(0, params.macBytes)
  const encKey = cek.slice(params.macBytes)
  const macInput = concatBytes(aad, iv, ciphertext, uint64BE(aad.length * 8))
  const hmacKey = yield* Effect.promise(() =>
    crypto.subtle.importKey("raw", u8(macKey), { name: "HMAC", hash: params.hash }, false, ["sign"])
  )
  const mac = new Uint8Array(yield* Effect.promise(() => crypto.subtle.sign("HMAC", hmacKey, u8(macInput))))
  if (!timingSafeEqual(mac.slice(0, params.tagBytes), tag)) {
    return yield* new JweError({ reason: "DecryptionFailed" })
  }
  const aesKey = yield* Effect.promise(() => crypto.subtle.importKey("raw", u8(encKey), "AES-CBC", false, ["decrypt"]))
  const plaintext = yield* Effect.tryPromise({
    try: () => crypto.subtle.decrypt({ name: "AES-CBC", iv: u8(iv) }, aesKey, u8(ciphertext)),
    catch: die("DecryptionFailed")
  })
  return new Uint8Array(plaintext)
})

// -------------------------------------------------------------------------------------
// Key management: Concat KDF + AES-KW helpers
// -------------------------------------------------------------------------------------

/** @internal RFC 7518 Section 4.6.2 Concat KDF specialised to SHA-256. */
const concatKdf = Effect.fnUntraced(function*(
  sharedSecret: Uint8Array,
  keyDataLenBits: number,
  algId: string,
  apu: Uint8Array,
  apv: Uint8Array
) {
  const encodeLengthPrefixed = (bytes: Uint8Array) => concatBytes(uint64BE(bytes.length).slice(4), bytes)
  const otherInfo = concatBytes(
    encodeLengthPrefixed(textEncoder.encode(algId)),
    encodeLengthPrefixed(apu),
    encodeLengthPrefixed(apv),
    uint64BE(keyDataLenBits).slice(4)
  )
  const hashLenBits = 256
  const reps = Math.ceil(keyDataLenBits / hashLenBits)
  const derived = new Uint8Array((reps * hashLenBits) / 8)
  for (let i = 1; i <= reps; i++) {
    const counter = uint64BE(i).slice(4)
    const digest = new Uint8Array(
      yield* Effect.promise(() => crypto.subtle.digest("SHA-256", u8(concatBytes(counter, sharedSecret, otherInfo))))
    )
    derived.set(digest, (i - 1) * (hashLenBits / 8))
  }
  return derived.slice(0, keyDataLenBits / 8)
})

const aesKwWrap = (kek: CryptoKey, cek: Uint8Array) =>
  Effect.gen(function*() {
    const cekKey = yield* Effect.promise(() =>
      crypto.subtle.importKey("raw", u8(cek), { name: "HMAC", hash: "SHA-256" }, true, ["sign"])
    )
    return new Uint8Array(yield* Effect.promise(() => crypto.subtle.wrapKey("raw", cekKey, kek, "AES-KW")))
  })

const aesKwUnwrap = (kek: CryptoKey, wrapped: Uint8Array) =>
  Effect.gen(function*() {
    const cekKey = yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.unwrapKey("raw", u8(wrapped), kek, "AES-KW", { name: "HMAC", hash: "SHA-256" }, true, ["sign"]),
      catch: die("KeyManagementFailed")
    })
    return new Uint8Array(yield* Effect.promise(() => crypto.subtle.exportKey("raw", cekKey)))
  })

const ecKeyInfo = (key: CryptoKey) => {
  const namedCurve = (key.algorithm as EcKeyAlgorithm).namedCurve
  // deriveBits length must be byte-aligned; P-521 shared secrets are 66 bytes.
  const bitLength = namedCurve === "P-256" ? 256 : namedCurve === "P-384" ? 384 : 528
  return { namedCurve, bitLength }
}

const aesKwBits = (alg: (typeof JweAlgorithm)["Type"]): 128 | 192 | 256 =>
  alg.includes("128") ? 128 : alg.includes("192") ? 192 : 256

// -------------------------------------------------------------------------------------
// Key management: encrypt / decrypt the CEK
// -------------------------------------------------------------------------------------

const keyManagementEncrypt = Effect.fnUntraced(function*(
  alg: (typeof JweAlgorithm)["Type"],
  enc: (typeof JweEncryption)["Type"],
  key: CryptoKey,
  cekBytes: number,
  options: { readonly p2c: number }
) {
  switch (alg) {
    case "dir": {
      const cek = new Uint8Array(yield* Effect.promise(() => crypto.subtle.exportKey("raw", key)))
      return { cek, encryptedKey: new Uint8Array(0), headerExtras: {} }
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256": {
      const cek = randomBytes(cekBytes)
      const encryptedKey = new Uint8Array(
        yield* Effect.tryPromise({
          try: () => crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, u8(cek)),
          catch: die("KeyManagementFailed")
        })
      )
      return { cek, encryptedKey, headerExtras: {} }
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      const cek = randomBytes(cekBytes)
      const encryptedKey = yield* aesKwWrap(key, cek)
      return { cek, encryptedKey, headerExtras: {} }
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      const cek = randomBytes(cekBytes)
      const iv = randomBytes(12)
      const combined = new Uint8Array(
        yield* Effect.promise(() =>
          crypto.subtle.encrypt({ name: "AES-GCM", iv: u8(iv), tagLength: 128 }, key, u8(cek))
        )
      )
      return {
        cek,
        encryptedKey: combined.slice(0, -16),
        headerExtras: { iv: base64Url(iv), tag: base64Url(combined.slice(-16)) }
      }
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      const { bitLength, namedCurve } = ecKeyInfo(key)
      const ephemeral = yield* Effect.promise(() =>
        crypto.subtle.generateKey({ name: "ECDH", namedCurve }, true, ["deriveBits"])
      )
      const sharedSecret = new Uint8Array(
        yield* Effect.promise(() =>
          crypto.subtle.deriveBits({ name: "ECDH", public: key }, ephemeral.privateKey, bitLength)
        )
      )
      const epk = yield* Effect.promise(() => crypto.subtle.exportKey("jwk", ephemeral.publicKey))
      const publicEpk = { kty: epk.kty, crv: epk.crv, x: epk.x, y: epk.y }
      if (alg === "ECDH-ES") {
        const cek = yield* concatKdf(sharedSecret, cekBytes * 8, enc, new Uint8Array(0), new Uint8Array(0))
        return { cek, encryptedKey: new Uint8Array(0), headerExtras: { epk: publicEpk } }
      }
      const kekRaw = yield* concatKdf(sharedSecret, aesKwBits(alg), alg, new Uint8Array(0), new Uint8Array(0))
      const kek = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", u8(kekRaw), "AES-KW", false, ["wrapKey", "unwrapKey"])
      )
      const cek = randomBytes(cekBytes)
      const encryptedKey = yield* aesKwWrap(kek, cek)
      return { cek, encryptedKey, headerExtras: { epk: publicEpk } }
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      const hash = alg.startsWith("PBES2-HS256") ? "SHA-256" : alg.startsWith("PBES2-HS384") ? "SHA-384" : "SHA-512"
      const p2s = randomBytes(16)
      const salt = concatBytes(textEncoder.encode(alg), new Uint8Array([0]), p2s)
      // Node's WebCrypto cannot deriveKey directly into an AES-KW key, so
      // derive the raw key-encryption-key bits and import them.
      const kekBits = new Uint8Array(
        yield* Effect.promise(() =>
          crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: u8(salt), iterations: options.p2c, hash },
            key,
            aesKwBits(alg)
          )
        )
      )
      const kek = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", u8(kekBits), "AES-KW", false, ["wrapKey", "unwrapKey"])
      )
      const cek = randomBytes(cekBytes)
      const encryptedKey = yield* aesKwWrap(kek, cek)
      return { cek, encryptedKey, headerExtras: { p2s: base64Url(p2s), p2c: options.p2c } }
    }
  }
})

const keyManagementDecrypt = Effect.fnUntraced(function*(
  header: (typeof ProtectedHeader)["Type"],
  key: CryptoKey,
  encryptedKey: Uint8Array,
  cekBytes: number
) {
  const alg = header.alg
  switch (alg) {
    case "dir":
      return new Uint8Array(yield* Effect.promise(() => crypto.subtle.exportKey("raw", key)))
    case "RSA-OAEP":
    case "RSA-OAEP-256":
      return new Uint8Array(
        yield* Effect.tryPromise({
          try: () => crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, u8(encryptedKey)),
          catch: die("DecryptionFailed")
        })
      )
    case "A128KW":
    case "A192KW":
    case "A256KW":
      return yield* aesKwUnwrap(key, encryptedKey)
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      if (header.iv === undefined || header.tag === undefined) return yield* new JweError({ reason: "Malformed" })
      const iv = fromBase64Url(header.iv)
      const tag = fromBase64Url(header.tag)
      const cek = yield* Effect.tryPromise({
        try: () =>
          crypto.subtle.decrypt(
            { name: "AES-GCM", iv: u8(iv), tagLength: 128 },
            key,
            u8(concatBytes(encryptedKey, tag))
          ),
        catch: die("DecryptionFailed")
      })
      return new Uint8Array(cek)
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (header.epk === undefined) return yield* new JweError({ reason: "Malformed" })
      const { bitLength, namedCurve } = ecKeyInfo(key)
      const ephemeralPublic = yield* Effect.tryPromise({
        try: () => crypto.subtle.importKey("jwk", header.epk as JsonWebKey, { name: "ECDH", namedCurve }, false, []),
        catch: die("KeyManagementFailed")
      })
      const sharedSecret = new Uint8Array(
        yield* Effect.promise(() => crypto.subtle.deriveBits({ name: "ECDH", public: ephemeralPublic }, key, bitLength))
      )
      if (alg === "ECDH-ES") {
        return yield* concatKdf(sharedSecret, cekBytes * 8, header.enc, new Uint8Array(0), new Uint8Array(0))
      }
      const kekRaw = yield* concatKdf(sharedSecret, aesKwBits(alg), alg, new Uint8Array(0), new Uint8Array(0))
      const kek = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", u8(kekRaw), "AES-KW", false, ["wrapKey", "unwrapKey"])
      )
      return yield* aesKwUnwrap(kek, encryptedKey)
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      if (header.p2s === undefined || header.p2c === undefined) return yield* new JweError({ reason: "Malformed" })
      const hash = alg.startsWith("PBES2-HS256") ? "SHA-256" : alg.startsWith("PBES2-HS384") ? "SHA-384" : "SHA-512"
      const salt = concatBytes(textEncoder.encode(alg), new Uint8Array([0]), fromBase64Url(header.p2s))
      const kekBits = new Uint8Array(
        yield* Effect.promise(() =>
          crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: u8(salt), iterations: header.p2c, hash },
            key,
            aesKwBits(alg)
          )
        )
      )
      const kek = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", u8(kekBits), "AES-KW", false, ["wrapKey", "unwrapKey"])
      )
      return yield* aesKwUnwrap(kek, encryptedKey)
    }
  }
})

// -------------------------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------------------------

/**
 * Encrypts a plaintext into a JWE Compact Serialization string.
 *
 * The `key` must be a WebCrypto `CryptoKey` appropriate for `algorithm`: an
 * RSA public key for RSA-OAEP, an AES key for the key-wrap families, an EC
 * key imported for `ECDH` for the ECDH-ES families, a PBKDF2 key for PBES2,
 * or the shared content key for `dir`.
 *
 * @category Encryption
 * @since 4.0.0
 */
export const encrypt = Effect.fnUntraced(function*(options: {
  readonly plaintext: string | Uint8Array
  readonly key: CryptoKey
  readonly algorithm: (typeof JweAlgorithm)["Type"]
  readonly encryption: (typeof JweEncryption)["Type"]
  readonly protectedHeader?: Record<string, unknown> | undefined
  /** PBES2 iteration count (defaults to 2048). */
  readonly p2c?: number | undefined
}) {
  const params = encryptionParameters(options.encryption)
  const km = yield* keyManagementEncrypt(options.algorithm, options.encryption, options.key, params.cekBytes, {
    p2c: options.p2c ?? 2048
  })

  const header = {
    ...options.protectedHeader,
    ...km.headerExtras,
    alg: options.algorithm,
    enc: options.encryption
  }
  const protectedB64 = base64Url(textEncoder.encode(JSON.stringify(header)))
  const aad = textEncoder.encode(protectedB64)
  const iv = randomBytes(params.ivBytes)
  const plaintextBytes = typeof options.plaintext === "string"
    ? textEncoder.encode(options.plaintext)
    : options.plaintext

  const { ciphertext, tag } = yield* contentEncrypt(params, km.cek, iv, plaintextBytes, aad)

  return [
    protectedB64,
    base64Url(km.encryptedKey),
    base64Url(iv),
    base64Url(ciphertext),
    base64Url(tag)
  ].join(".")
})

/**
 * Decrypts a JWE Compact Serialization string, returning the decoded
 * protected header and the plaintext bytes. The `key` must be the
 * counterpart to the one used for encryption (RSA/EC private key, or the
 * shared symmetric/PBKDF2 key).
 *
 * @category Decryption
 * @since 4.0.0
 */
export const decrypt = Effect.fnUntraced(function*(options: {
  readonly jwe: string
  readonly key: CryptoKey
}) {
  const parts = yield* Schema.decodeUnknownEffect(Compact)(options.jwe).pipe(
    Effect.mapError((cause) => new JweError({ reason: "Malformed", cause }))
  )

  const headerJson = new TextDecoder().decode(fromBase64Url(parts.protected))
  const header = yield* Schema.decodeUnknownEffect(ProtectedHeader)(
    yield* Effect.try({ try: () => JSON.parse(headerJson), catch: die("Malformed") })
  ).pipe(Effect.mapError((cause) => new JweError({ reason: "Malformed", cause })))

  const params = encryptionParameters(header.enc)
  const cek = yield* keyManagementDecrypt(header, options.key, fromBase64Url(parts.encryptedKey), params.cekBytes)

  const aad = textEncoder.encode(parts.protected)
  const plaintext = yield* contentDecrypt(
    params,
    cek,
    fromBase64Url(parts.iv),
    fromBase64Url(parts.ciphertext),
    fromBase64Url(parts.tag),
    aad
  )

  return { protectedHeader: header, plaintext }
})
