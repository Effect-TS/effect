import * as Effect from "../../Effect.ts"
import * as Predicate from "../../Predicate.ts"
import * as CryptoError from "../CryptoError.ts"
import * as KeyModel from "./key.ts"
import * as internal from "./webCrypto.ts"

/**
 * How an asymmetric algorithm maps onto `crypto.subtle`, and the forms its
 * keys are stored in (section 5 of the design).
 *
 * @internal
 */
export interface Spec {
  /** The WebCrypto algorithm name, which a `CryptoKey` must also have. */
  readonly name: string
  readonly importParams: AlgorithmIdentifier | EcKeyImportParams | RsaHashedImportParams
  readonly privateUsages: ReadonlyArray<KeyUsage>
  readonly publicUsages: ReadonlyArray<KeyUsage>
  /**
   * The fixed PKCS#8 prefix of an Ed25519 or X25519 key, whose private keys
   * hold the bare 32-byte seed. Other private keys hold PKCS#8.
   */
  readonly seedPrefix: Uint8Array | undefined
  /** `raw` for Ed25519, X25519 and EC points, `spki` for RSA. */
  readonly publicFormat: "raw" | "spki"
  /** Checks the curve or hash of a `CryptoKey`'s algorithm. */
  readonly check?: ((algorithm: KeyAlgorithm) => string | undefined) | undefined
}

// RFC 8410: the PKCS#8 encoding of a 32-byte Ed25519 or X25519 private key is
// this prefix, ending in the algorithm's OID byte, followed by the key.
const seedPrefix = (oid: number): Uint8Array => Uint8Array.of(48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, oid, 4, 34, 4, 32)

/** @internal */
export const ed25519Prefix = seedPrefix(112)

/** @internal */
export const x25519Prefix = seedPrefix(110)

/** @internal */
export const seedLength = 32

/** @internal */
export type Curve = "P-256" | "P-384" | "P-521"

/**
 * Coordinate sizes in bytes, which are also the sizes of an ECDSA signature's
 * `r` and `s` and of an ECDH shared secret.
 *
 * @internal
 */
export const coordinateSizes: Record<Curve, number> = { "P-256": 32, "P-384": 48, "P-521": 66 }

/**
 * Checks the length of a raw Ed25519 or X25519 key. The 64-byte libsodium
 * `seed‖pk` form is named, since slicing it is the fix.
 *
 * @internal
 */
export const checkSeedLength = (name: string, role: "private" | "public") => (length: number): string | undefined => {
  if (length === seedLength) return undefined
  if (role === "private" && length === 64) {
    return `Expected the 32-byte ${name} seed, not the 64-byte seed‖public key form: pass its first 32 bytes`
  }
  return `Expected a ${seedLength}-byte ${name} ${role} key, not ${length} bytes`
}

/**
 * Checks the encoding of a raw EC public key: an uncompressed SEC1 point,
 * `0x04` followed by both coordinates. Whether the point is on the curve is
 * checked when the key is first used.
 *
 * @internal
 */
export const checkPoint = (curve: Curve) => (bytes: Uint8Array): string | undefined => {
  const length = 1 + 2 * coordinateSizes[curve]
  if (bytes.length !== length) return `Expected a ${length}-byte uncompressed ${curve} point, not ${bytes.length} bytes`
  return bytes[0] === 4 ? undefined : `Expected an uncompressed ${curve} point, starting with 0x04`
}

/** @internal */
export const checkNamedCurve = (curve: Curve) => (algorithm: KeyAlgorithm): string | undefined => {
  const namedCurve = (algorithm as EcKeyAlgorithm).namedCurve
  return namedCurve === curve ? undefined : `Expected a ${curve} key, not ${namedCurve}`
}

/** @internal */
export const checkHash = (hash: string) => (algorithm: KeyAlgorithm): string | undefined => {
  const keyHash = (algorithm as RsaHashedKeyAlgorithm).hash?.name
  return keyHash === hash ? undefined : `Expected a key for ${hash}, not ${keyHash}`
}

/**
 * Copies raw key bytes into a byte-backed key. Unlike `KeyModel.fromBytes`,
 * the check sees the bytes, so it can check an EC point's prefix.
 *
 * @internal
 */
export const fromBytes = <K>(
  module: string,
  method: string,
  proto: object,
  algorithm: unknown,
  bytes: Uint8Array,
  check: (bytes: Uint8Array) => string | undefined
): Effect.Effect<K, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    if (!(bytes instanceof Uint8Array)) return KeyModel.invalidKey(module, method, "Expected the key as a Uint8Array")
    const problem = check(bytes)
    return problem === undefined
      ? Effect.succeed(KeyModel.make<K>(proto, algorithm, { _tag: "Bytes", bytes: KeyModel.copyBytes(bytes) }))
      : KeyModel.invalidKey(module, method, problem)
  })

/**
 * Builds a key backed by a `CryptoKey`, after checking it against the typed
 * key synchronously.
 *
 * @internal
 */
export const fromCryptoKey = <K>(
  module: string,
  method: string,
  proto: object,
  algorithm: unknown,
  spec: Spec,
  role: "private" | "public",
  cryptoKey: CryptoKey
): Effect.Effect<K, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const problem = KeyModel.checkCryptoKey(cryptoKey, {
      type: role,
      name: spec.name,
      usages: role === "private" ? spec.privateUsages : spec.publicUsages,
      usagePolicy: "all",
      ...(spec.check === undefined ? {} : { check: spec.check })
    })
    return problem === undefined
      ? Effect.succeed(KeyModel.make<K>(proto, algorithm, { _tag: "CryptoKey", cryptoKey }))
      : KeyModel.invalidKey(module, method, problem)
  })

const concat = (prefix: Uint8Array, bytes: Uint8Array): Uint8Array => {
  const out = new Uint8Array(prefix.length + bytes.length)
  out.set(prefix)
  out.set(bytes, prefix.length)
  return out
}

/** @internal */
export const importPrivate = (
  subtle: SubtleCrypto,
  bytes: Uint8Array,
  spec: Spec,
  extractable: boolean
): Promise<CryptoKey> =>
  subtle.importKey(
    "pkcs8",
    (spec.seedPrefix === undefined ? bytes : concat(spec.seedPrefix, bytes)) as BufferSource,
    spec.importParams,
    extractable,
    spec.privateUsages as Array<KeyUsage>
  )

/** @internal */
export const importPublic = (subtle: SubtleCrypto, bytes: Uint8Array, spec: Spec): Promise<CryptoKey> =>
  subtle.importKey(
    spec.publicFormat,
    bytes as BufferSource,
    spec.importParams,
    true,
    spec.publicUsages as Array<KeyUsage>
  )

class UnexpectedExport extends Error {}

/**
 * Exports a private `CryptoKey` to its stored form: the seed for Ed25519 and
 * X25519, PKCS#8 otherwise.
 *
 * @internal
 */
export const exportPrivate = async (subtle: SubtleCrypto, cryptoKey: CryptoKey, spec: Spec): Promise<Uint8Array> => {
  const pkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", cryptoKey))
  const prefix = spec.seedPrefix
  if (prefix === undefined) return pkcs8
  if (pkcs8.length !== prefix.length + seedLength || !prefix.every((byte, i) => pkcs8[i] === byte)) {
    throw new UnexpectedExport(`${spec.name} private key was exported in an unexpected PKCS#8 form`)
  }
  return pkcs8.slice(prefix.length)
}

/** @internal */
export const exportPublic = async (subtle: SubtleCrypto, cryptoKey: CryptoKey, spec: Spec): Promise<Uint8Array> =>
  new Uint8Array(await subtle.exportKey(spec.publicFormat, cryptoKey))

/**
 * Maps an exception from `crypto.subtle`, treating an export the layer cannot
 * read as `Unsupported`.
 *
 * @internal
 */
export const error = (module: string, method: string, cause: unknown): CryptoError.CryptoError =>
  cause instanceof UnexpectedExport
    ? new CryptoError.CryptoError({
      module,
      method,
      reason: new CryptoError.Unsupported({ description: cause.message })
    })
    : internal.webCryptoError(module, method, cause)

/**
 * Runs `f` on the `subtle` of a `Crypto` object, dying when it is missing.
 *
 * @internal
 */
export const run = <A>(
  module: string,
  method: string,
  crypto: Crypto | undefined,
  f: (subtle: SubtleCrypto) => Promise<A>,
  onError: (cause: unknown) => CryptoError.CryptoError = (cause) => error(module, method, cause)
): Effect.Effect<A, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const subtle = crypto?.subtle
    if (subtle === undefined) return Effect.die(internal.subtleUnavailable())
    return Effect.tryPromise({ try: () => f(subtle), catch: onError })
  })

/**
 * Exports a key's stored representation as fresh bytes, reading the
 * `WebCrypto` reference for `CryptoKey`-backed keys.
 *
 * @internal
 */
export const toBytes = (
  module: string,
  key: object,
  spec: Spec,
  role: "private" | "public"
): Effect.Effect<Uint8Array, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const stored = KeyModel.material(key)
    if (stored._tag === "Bytes") return Effect.succeed(KeyModel.copyBytes(stored.bytes))
    const cryptoKey = stored.cryptoKey
    if (!cryptoKey.extractable) return notExtractable(module, "toBytes")
    return Effect.flatMap(internal.subtle, (subtle) =>
      Effect.tryPromise({
        try: () => role === "private" ? exportPrivate(subtle, cryptoKey, spec) : exportPublic(subtle, cryptoKey, spec),
        catch: (cause) => error(module, "toBytes", cause)
      }))
  })

/** @internal */
export const notExtractable = (module: string, method: string) =>
  KeyModel.fail(module, method, new CryptoError.NotExtractable({ description: "The CryptoKey is not extractable" }))

/**
 * Computes the stored public key of an extractable private `CryptoKey`.
 *
 * WebCrypto cannot derive a public key directly, but a private key's JWK
 * export carries the public members, which import as a public key.
 *
 * @internal
 */
export const publicOf = async (subtle: SubtleCrypto, privateKey: CryptoKey, spec: Spec): Promise<Uint8Array> => {
  const { d, p, q, dp, dq, qi, oth, key_ops, ext, alg, ...jwk } = await subtle.exportKey("jwk", privateKey)
  const publicKey = await subtle.importKey("jwk", jwk, spec.importParams, true, spec.publicUsages as Array<KeyUsage>)
  return exportPublic(subtle, publicKey, spec)
}

/**
 * Generates a key pair's stored forms. Ed25519 and X25519 private keys are
 * the given seed, so a seeded `SecureRandom` reproduces them. EC and RSA keys
 * come from WebCrypto's own randomness.
 *
 * @internal
 */
export const generate = async (
  subtle: SubtleCrypto,
  spec: Spec,
  params: AlgorithmIdentifier | EcKeyGenParams | RsaHashedKeyGenParams,
  seed: Uint8Array | undefined
): Promise<{ readonly privateKey: Uint8Array; readonly publicKey: Uint8Array }> => {
  if (seed !== undefined) {
    const privateKey = await importPrivate(subtle, seed, spec, true)
    return { privateKey: seed, publicKey: await publicOf(subtle, privateKey, spec) }
  }
  const usages = [...new Set([...spec.privateUsages, ...spec.publicUsages])]
  const pair = await subtle.generateKey(params, true, usages) as CryptoKeyPair
  return {
    privateKey: await exportPrivate(subtle, pair.privateKey, spec),
    publicKey: await exportPublic(subtle, pair.publicKey, spec)
  }
}

/**
 * Computes the public key of a private key, failing with `NotExtractable`
 * for a non-extractable `CryptoKey`, whose public members cannot be read.
 *
 * @internal
 */
export const publicKeyOf = <K>(
  module: string,
  crypto: Crypto | undefined,
  privateKey: { readonly algorithm: unknown },
  spec: Spec,
  proto: object
): Effect.Effect<K, CryptoError.CryptoError> =>
  Effect.suspend(() => {
    const stored = KeyModel.material(privateKey)
    if (stored._tag === "CryptoKey" && !stored.cryptoKey.extractable) return notExtractable(module, "publicKeyOf")
    return Effect.map(
      run(module, "publicKeyOf", crypto, async (subtle) =>
        publicOf(
          subtle,
          stored._tag === "CryptoKey" ? stored.cryptoKey : await importPrivate(subtle, stored.bytes, spec, true),
          spec
        )),
      (bytes) => KeyModel.make<K>(proto, privateKey.algorithm, { _tag: "Bytes", bytes })
    )
  })

/**
 * Deno imports raw EC points that are not on the curve and rejects them with
 * a `TypeError` when the key is used. For a byte-backed public key only the
 * key can cause that, so it is `InvalidKey`. Any other `TypeError`, such as a
 * `CryptoKey` from another `Crypto` object, stays a defect.
 *
 * @internal
 */
export const publicKeyError = (
  module: string,
  method: string,
  publicKey: object,
  cause: unknown
): CryptoError.CryptoError =>
  KeyModel.material(publicKey)._tag === "Bytes" && Predicate.hasProperty(cause, "name") && cause.name === "TypeError"
    ? new CryptoError.CryptoError({
      module,
      method,
      reason: new CryptoError.InvalidKey({ description: "Invalid public key", cause })
    })
    : error(module, method, cause)

/**
 * What `KeyFormat` needs from an asymmetric family to build its keys: the
 * WebCrypto mapping of each algorithm and the key prototypes.
 *
 * @internal
 */
export interface Family {
  readonly module: string
  readonly specOf: (algorithm: any) => Spec
  readonly privateKeyProto: object
  readonly publicKeyProto: object
  readonly isPrivateKey: (u: unknown) => boolean
}
