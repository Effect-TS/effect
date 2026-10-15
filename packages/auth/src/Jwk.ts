/**
 * Schemas, generation, import, and export for algorithm-bound JOSE keys. Private and symmetric material remains redacted.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Aes from "effect/crypto/Aes"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Hmac from "effect/crypto/Hmac"
import * as Rsa from "effect/crypto/Rsa"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { decode as decodeInput, derBytes, native, withPrivateKey, withSecret } from "./internal/crypto.ts"
import type { CryptoUnavailable, OperationError, UnsupportedAlgorithm } from "./internal/cryptoErrors.ts"
import { decode, reveal } from "./internal/encoding.ts"
import * as KeyInput from "./internal/keyInput.ts"
import * as KeyPolicy from "./internal/keyPolicy.ts"
import { InvalidKey } from "./JoseError.ts"

/**
 * Schema for the supported asymmetric signing algorithms: RS256, PS256, ES256, and EdDSA.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const AsymmetricAlgorithm = Schema.Literals(["RS256", "PS256", "ES256", "EdDSA"])
/**
 * Value described by the AsymmetricAlgorithm schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type AsymmetricAlgorithm = typeof AsymmetricAlgorithm.Type
/**
 * Schema for the supported JWS algorithms, including HS256.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Algorithm = Schema.Literals(["HS256", "RS256", "PS256", "ES256", "EdDSA"])
/**
 * Value described by the Algorithm schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Algorithm = typeof Algorithm.Type

const encodedBytes = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]+$/),
  Schema.isMaxLength(16384)
)

const operations = Schema.Array(Schema.NonEmptyString).check(
  Schema.isMaxLength(KeyInput.maxArrayLength),
  Schema.makeFilter((values) => new Set(values).size === values.length)
)

const metadata = {
  kid: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  alg: Schema.optionalKey(Schema.NonEmptyString),
  use: Schema.optionalKey(Schema.Literals(["sig", "enc"])),
  key_ops: Schema.optionalKey(operations),
  /** Optional issuer restriction published with a public key. */
  issuer: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
}

const rsa = { ...metadata, kty: Schema.Literal("RSA"), n: encodedBytes, e: encodedBytes }

const ec = {
  ...metadata,
  kty: Schema.Literal("EC"),
  crv: Schema.Literal("P-256"),
  x: encodedBytes,
  y: encodedBytes
}

const okp = {
  ...metadata,
  kty: Schema.Literal("OKP"),
  crv: Schema.Literal("Ed25519"),
  x: encodedBytes
}

const noSecret = { d: Schema.optionalKey(Schema.Never), k: Schema.optionalKey(Schema.Never) }

/**
 * Schema for RSA, P-256, and Ed25519 public JWKs, rejecting private and symmetric key material.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const PublicJwk = Schema.Union([
  Schema.Struct({ ...rsa, ...noSecret }),
  Schema.Struct({ ...ec, ...noSecret }),
  Schema.Struct({ ...okp, ...noSecret })
])

/**
 * Value described by the PublicJwk schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type PublicJwk = typeof PublicJwk.Type

/**
 * Schema for RSA, P-256, and Ed25519 private JWKs.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const PrivateJwk = Schema.Union([
  Schema.Struct({
    ...rsa,
    d: encodedBytes,
    p: encodedBytes,
    q: encodedBytes,
    dp: encodedBytes,
    dq: encodedBytes,
    qi: encodedBytes,
    oth: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({ ...ec, d: encodedBytes }),
  Schema.Struct({ ...okp, d: encodedBytes })
])

/**
 * Value described by the PrivateJwk schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type PrivateJwk = typeof PrivateJwk.Type

/**
 * Schema for an octet-sequence JWK with optional key-use metadata.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const SecretJwk = Schema.Struct({
  ...metadata,
  kty: Schema.Literal("oct"),
  k: encodedBytes
})

/**
 * Value described by the SecretJwk schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type SecretJwk = typeof SecretJwk.Type

/**
 * Schema for asymmetric key generation options and an optional key identifier.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const GenerateKeyPairInput = Schema.Union([
  Schema.Struct({
    algorithm: Schema.Literals(["RS256", "PS256"]),
    modulusLength: Schema.optionalKey(Schema.Literals([2048, 3072, 4096])),
    kid: metadata.kid
  }),
  Schema.Struct({ algorithm: Schema.Literals(["ES256", "EdDSA"]), kid: metadata.kid })
])

/**
 * Value described by the GenerateKeyPairInput schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type GenerateKeyPairInput = typeof GenerateKeyPairInput.Type

/**
 * Schema for a generated public JWK and its redacted private JWK.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const GeneratedKeyPair = Schema.Struct({
  publicKey: PublicJwk,
  privateKey: Schema.Redacted(PrivateJwk, { disallowJsonEncode: true })
})

/**
 * Value described by the GeneratedKeyPair schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type GeneratedKeyPair = typeof GeneratedKeyPair.Type

/**
 * Validated, algorithm-bound public key snapshot and encoded verification material.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface PublicKey {
  readonly _tag: "PublicKey"
  readonly algorithm: AsymmetricAlgorithm
  readonly jwk: PublicJwk
  readonly material: Uint8Array
}

/**
 * Validated, algorithm-bound private key snapshot with redacted JWK and signing material.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface PrivateKey {
  readonly _tag: "PrivateKey"
  readonly algorithm: AsymmetricAlgorithm
  readonly jwk: Redacted.Redacted<PrivateJwk>
  readonly material: Redacted.Redacted<Uint8Array>
}

/**
 * Validated symmetric key snapshot bound to HS256 signing or direct encryption.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface SecretKey {
  readonly _tag: "SecretKey"
  readonly algorithm: "HS256" | "dir"
  readonly jwk: Redacted.Redacted<SecretJwk>
  readonly material: Redacted.Redacted<Uint8Array>
}

/**
 * Private or symmetric key accepted by JWS and JWT signing operations.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type SigningKey = PrivateKey | SecretKey
/**
 * Public or symmetric key accepted by JWS and JWT verification operations.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type VerificationKey = PublicKey | SecretKey

type ImportError = InvalidKey | CryptoUnavailable | UnsupportedAlgorithm

/**
 * Generates asymmetric signing JWKs through the Rsa, Ecdsa, or Ed25519 service, keeping private material redacted.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const generateKeyPair = Effect.fnUntraced(function*(
  input: GenerateKeyPairInput
): Effect.fn.Return<GeneratedKeyPair, InvalidKey | OperationError, Rsa.Rsa | Ecdsa.Ecdsa | Ed25519.Ed25519> {
  const value = yield* Schema.decodeEffect(GenerateKeyPairInput)(input).pipe(
    Effect.mapError(() => InvalidKey.make({}))
  )
  let exported: Redacted.Redacted<JsonWebKey>
  switch (value.algorithm) {
    case "ES256": {
      const ecdsa = yield* Ecdsa.Ecdsa
      exported = yield* native(withPrivateKey(
        ecdsa.generateKeyPair({ curve: "P-256" }).pipe(Effect.map((pair) => pair.privateKey)),
        (key) => Ecdsa.privateKeyToJwk("P-256", key)
      ))
      break
    }
    case "EdDSA": {
      const ed25519 = yield* Ed25519.Ed25519
      exported = yield* native(withPrivateKey(
        ed25519.generateKeyPair().pipe(Effect.map((pair) => pair.privateKey)),
        Ed25519.privateKeyToJwk
      ))
      break
    }
    default: {
      const rsa = yield* Rsa.Rsa
      exported = yield* native(withPrivateKey(
        rsa.generateKeyPair({ modulusLength: value.modulusLength ?? 2048 }).pipe(Effect.map((pair) => pair.privateKey)),
        Rsa.privateKeyToJwk
      ))
    }
  }
  const privateJwk = yield* read(PrivateJwk, {
    ...Redacted.value(exported),
    alg: value.algorithm,
    use: "sig",
    ...(value.kid === undefined ? {} : { kid: value.kid })
  })
  const { d, ...publicJwk } = privateJwk
  return {
    publicKey: { ...(yield* read(PublicJwk, publicJwk)) },
    privateKey: Redacted.make({ ...privateJwk })
  } satisfies GeneratedKeyPair
})

const read = <S extends Schema.Constraint>(schema: S, input: unknown) =>
  Effect.try({
    try: () => KeyInput.jwk(input),
    catch: () => InvalidKey.make({})
  }).pipe(
    Effect.flatMap(Effect.fromResult),
    Effect.flatMap((captured) =>
      Schema.decodeUnknownEffect(schema)(captured, { reportInput: false }).pipe(
        Effect.mapError(() => InvalidKey.make({}))
      )
    ),
    Effect.map(KeyInput.detach)
  )

const bytes = (value: string) => decode(value).pipe(Effect.mapError(() => InvalidKey.make({})))

const snapshot = <A extends PublicJwk | PrivateJwk | SecretJwk>(jwk: A): A => {
  if (jwk.key_ops !== undefined) Object.freeze(jwk.key_ops)

  return Object.freeze(jwk)
}

const checkComponents = Effect.fnUntraced(function*(
  jwk: PublicJwk | PrivateJwk,
  algorithm: AsymmetricAlgorithm
): Effect.fn.Return<void, InvalidKey> {
  if (jwk.alg !== undefined && jwk.alg !== algorithm) return yield* InvalidKey.make({})
  let components: ReadonlyArray<string>
  switch (jwk.kty) {
    case "EC":
      if (algorithm !== "ES256") return yield* InvalidKey.make({})
      components = [jwk.x, jwk.y, ...(jwk.d === undefined ? [] : [jwk.d])]
      break
    case "OKP":
      if (algorithm !== "EdDSA") return yield* InvalidKey.make({})
      components = [jwk.x, ...(jwk.d === undefined ? [] : [jwk.d])]
      break
    case "RSA":
      if (algorithm !== "RS256" && algorithm !== "PS256") return yield* InvalidKey.make({})
      components = [jwk.n, jwk.e, ...(jwk.d === undefined ? [] : [jwk.d, jwk.p, jwk.q, jwk.dp, jwk.dq, jwk.qi])]
      break
  }
  const minimum = jwk.kty === "RSA" ? 1 : 32
  const maximum = jwk.kty === "RSA" ? 1024 : 32
  for (const component of components) {
    const decoded = yield* bytes(component)
    const valid = decoded.length >= minimum && decoded.length <= maximum
    decoded.fill(0)
    if (!valid) return yield* InvalidKey.make({})
  }
})

/**
 * Validates and snapshots a public JWK for the explicitly selected asymmetric algorithm.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const importPublic = Effect.fnUntraced(function*(
  input: unknown,
  selected: AsymmetricAlgorithm
): Effect.fn.Return<PublicKey, ImportError> {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)
  const jwk = yield* read(PublicJwk, input)
  yield* checkComponents(jwk, algorithm)
  const { key_ops, ...inputJwk } = jwk
  const material = yield* Effect.gen(function*() {
    switch (algorithm) {
      case "ES256":
        return yield* Ecdsa.publicKeyToSpki("P-256", yield* Ecdsa.publicKeyFromJwk("P-256", inputJwk))
      case "EdDSA":
        return yield* Ed25519.publicKeyToSpki(yield* Ed25519.publicKeyFromJwk(inputJwk))
      default: {
        const key = yield* Rsa.publicKeyFromJwk(inputJwk)
        yield* KeyPolicy.checkRsa(key)
        return key
      }
    }
  }).pipe(native, Effect.catchTag("CryptoInvalidInput", () => InvalidKey.make({})))

  return Object.freeze({
    _tag: "PublicKey",
    algorithm,
    jwk: snapshot(jwk),
    material
  }) satisfies PublicKey
})

/**
 * Validates and snapshots a redacted private JWK for the explicitly selected asymmetric algorithm.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const importPrivate = Effect.fnUntraced(function*(
  input: Redacted.Redacted<unknown>,
  selected: AsymmetricAlgorithm
): Effect.fn.Return<PrivateKey, ImportError> {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)

  const jwk = yield* read(
    PrivateJwk,
    yield* reveal(input).pipe(Effect.mapError(() => InvalidKey.make({})))
  )

  yield* checkComponents(jwk, algorithm)
  const { key_ops, ...inputJwk } = jwk
  const material = yield* Effect.gen(function*() {
    switch (algorithm) {
      case "ES256":
        return yield* Ecdsa.privateKeyFromJwk("P-256", inputJwk)
      case "EdDSA":
        return yield* Ed25519.privateKeyFromJwk(inputJwk)
      default:
        return yield* withPrivateKey(Rsa.privateKeyFromJwk(inputJwk), (key) =>
          Effect.gen(function*() {
            yield* KeyPolicy.checkRsa(yield* Rsa.publicKeyFromPrivateKey(key))
            // The temporary branded key is wiped after copying the retained material.
            return Redacted.make(new Uint8Array(Redacted.value(key)))
          }))
    }
  }).pipe(native, Effect.catchTag("CryptoInvalidInput", () => InvalidKey.make({})))

  return Object.freeze({
    _tag: "PrivateKey",
    algorithm,
    jwk: Redacted.make(snapshot(jwk)),
    material
  }) satisfies PrivateKey
})

/**
 * Imports redacted PKCS8 DER through Effect crypto key helpers and binds the private key to an algorithm.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const importPkcs8 = Effect.fnUntraced(function*(
  input: Redacted.Redacted<Uint8Array>,
  selected: AsymmetricAlgorithm,
  options?: { readonly kid?: string }
): Effect.fn.Return<PrivateKey, ImportError> {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)

  const exported = yield* withSecret(input, (owned) =>
    Effect.gen(function*() {
      yield* decodeInput(derBytes, owned, "key")
      switch (algorithm) {
        case "ES256":
          return yield* native(withPrivateKey(
            Ecdsa.privateKeyFromPkcs8("P-256", owned),
            (key) => Ecdsa.privateKeyToJwk("P-256", key)
          ))
        case "EdDSA":
          return yield* native(withPrivateKey(Ed25519.privateKeyFromPkcs8(owned), Ed25519.privateKeyToJwk))
        default:
          return yield* native(withPrivateKey(Rsa.privateKeyFromPkcs8(owned), Rsa.privateKeyToJwk))
      }
    })).pipe(Effect.mapError(() => InvalidKey.make({})))

  return yield* importPrivate(
    Redacted.make({
      ...Redacted.value(exported),
      alg: algorithm,
      use: "sig",
      ...(options?.kid === undefined ? {} : { kid: options.kid })
    }),
    algorithm
  )
})

/**
 * Imports a redacted octet JWK with at least 32 bytes for HS256 or exactly 32 bytes for direct encryption.
 *
 * **Example** (Binding a symmetric signing key)
 *
 * ```ts import.meta.vitest
 * import { Jwk } from "@effect/auth"
 * import { Effect, Redacted } from "effect"
 *
 * // Fixed public example material; generate application secrets securely.
 * const secret = Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" })
 * const key = await Effect.runPromise(Jwk.importSecret(secret, "HS256"))
 * key.algorithm // => "HS256"
 * key._tag // => "SecretKey"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const importSecret = Effect.fnUntraced(function*(
  input: Redacted.Redacted<unknown>,
  selected: "HS256" | "dir"
): Effect.fn.Return<SecretKey, InvalidKey> {
  const algorithm = yield* read(Schema.Literals(["HS256", "dir"]), selected)

  const jwk = yield* read(
    SecretJwk,
    yield* reveal(input).pipe(Effect.mapError(() => InvalidKey.make({})))
  )

  const material = yield* bytes(jwk.k)

  if (
    (jwk.alg !== undefined && jwk.alg !== algorithm) ||
    material.length < 32 ||
    (algorithm === "dir" && material.length !== 32)
  ) {
    material.fill(0)

    return yield* InvalidKey.make({})
  }

  material.fill(0)
  const imported = yield* native(
    algorithm === "HS256"
      ? Hmac.keyFromJwk({ kty: "oct", k: jwk.k })
      : Aes.keyFromJwk({ kty: "oct", k: jwk.k })
  ).pipe(Effect.mapError(() => InvalidKey.make({})))

  return Object.freeze({
    _tag: "SecretKey",
    algorithm,
    jwk: Redacted.make(snapshot(jwk)),
    material: imported
  }) satisfies SecretKey
})

/**
 * Returns a detached, validated public JWK from an imported key.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.5
 */
export const exportPublic = Effect.fnUntraced(function*(key: PublicKey) {
  return yield* read(PublicJwk, key.jwk)
})

/**
 * Returns a detached private or symmetric JWK while preserving its redacted wrapper.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.5
 */
export const exportPrivate = Effect.fnUntraced(function*(key: PrivateKey | SecretKey) {
  const value = yield* reveal<PrivateJwk | SecretJwk>(key.jwk).pipe(
    Effect.mapError(() => InvalidKey.make({}))
  )

  return Redacted.make(yield* read(Schema.Union([PrivateJwk, SecretJwk]), value))
})
