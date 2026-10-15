/**
 * Schemas, generation, import, and export for algorithm-bound JOSE keys. Private and symmetric material remains redacted.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as KeyFormat from "effect/crypto/KeyFormat"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { decode as decodeInput, defectError, derBytes, native, withSecret } from "../internal/crypto.ts"
import { decode, reveal } from "../internal/encoding.ts"
import * as KeyInput from "../internal/keyInput.ts"
import * as KeyPolicy from "../internal/keyPolicy.ts"
import {
  type CryptoUnavailable,
  InvalidInput,
  InvalidKey,
  type OperationError,
  type UnsupportedAlgorithm
} from "../JoseError.ts"

/**
 * Schema for the supported asymmetric signing algorithms: RS256, PS256, ES256, and EdDSA.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const AsymmetricAlgorithm = Schema.Literals(["RS256", "PS256", "ES256", "EdDSA"])
/**
 * Value described by the AsymmetricAlgorithm schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type AsymmetricAlgorithm = typeof AsymmetricAlgorithm.Type
/**
 * Schema for the supported JWS algorithms, including HS256.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Algorithm = Schema.Literals(["HS256", "RS256", "PS256", "ES256", "EdDSA"])
/**
 * Value described by the Algorithm schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
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
  /**
   * Optional issuer restriction published with a public key.
   */
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
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type PublicJwk = typeof PublicJwk.Type

/**
 * Schema for RSA, P-256, and Ed25519 private JWKs.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type PrivateJwk = typeof PrivateJwk.Type

/**
 * Schema for an octet-sequence JWK with optional key-use metadata.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type SecretJwk = typeof SecretJwk.Type

/**
 * Schema for asymmetric key generation options and an optional key identifier.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type GenerateKeyPairInput = typeof GenerateKeyPairInput.Type

/**
 * Schema for a generated public JWK and its redacted private JWK.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type GeneratedKeyPair = typeof GeneratedKeyPair.Type

/**
 * Validated, algorithm-bound public key snapshot and encoded verification material.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
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
 * @since 4.1.0
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
 * @since 4.1.0
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
 * @since 4.1.0
 */
export type SigningKey = PrivateKey | SecretKey
/**
 * Public or symmetric key accepted by JWS and JWT verification operations.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type VerificationKey = PublicKey | SecretKey

/**
 * Failures produced by key validation or the cryptographic backend during key import.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type ImportError = InvalidKey | CryptoUnavailable | UnsupportedAlgorithm

/**
 * Generates asymmetric signing JWKs through the Signature service, keeping private material redacted.
 *
 * @see {@link importPrivate} for preparing the generated key for signing
 * @see {@link importPublic} for preparing the generated key for verification
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const generateKeyPair = Effect.fnUntraced(function*(
  input: GenerateKeyPairInput
): Effect.fn.Return<GeneratedKeyPair, InvalidKey | OperationError, Signature.Signature> {
  const value = yield* Schema.decodeEffect(GenerateKeyPairInput)(input).pipe(
    Effect.mapError(() => InvalidKey.make({}))
  )
  const signature = yield* Signature.Signature
  const exported = yield* native(Effect.gen(function*() {
    const pair = yield* signature.generateKeyPair(
      KeyPolicy.signatureAlgorithm(value.algorithm, "modulusLength" in value ? value.modulusLength : undefined)
    )
    return Redacted.make(
      yield* KeyFormat.encode(
        KeyFormat.jwk,
        pair.privateKey as KeyFormat.PrivateKey<Signature.Algorithm>
      )
    )
  }))
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
 * @see {@link exportPublic}
 * @see {@link importPrivate}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importPublic = Effect.fnUntraced(function*(
  input: unknown,
  selected: AsymmetricAlgorithm
): Effect.fn.Return<PublicKey, ImportError> {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)
  const jwk = yield* read(PublicJwk, input)
  yield* checkComponents(jwk, algorithm)
  const { key_ops, ...inputJwk } = jwk
  const material = yield* native(
    Effect.gen(function*() {
      const key = yield* KeyFormat.decodePublic(KeyFormat.jwk, KeyPolicy.signatureAlgorithm(algorithm), inputJwk)
      yield* KeyPolicy.checkRsa(key)
      return yield* KeyFormat.encode(KeyFormat.spki, key)
    }),
    (cause) =>
      // Deno may defer rejecting an invalid EC point until key export.
      algorithm === "ES256" && Predicate.hasProperty(cause, "name") && cause.name === "OperationError"
        ? InvalidInput.make({ reason: "key" })
        : defectError(cause)
  ).pipe(Effect.catchTag("JoseInvalidInput", () => InvalidKey.make({})))

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
 * @see {@link importPkcs8} for importing DER-encoded keys
 * @see {@link exportPrivate}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
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
    const key = yield* KeyFormat.decodePrivate(KeyFormat.jwk, KeyPolicy.signatureAlgorithm(algorithm), inputJwk)
    yield* KeyPolicy.checkRsa(key)
    return Redacted.make(yield* KeyFormat.encode(KeyFormat.pkcs8, key))
  }).pipe(native, Effect.catchTag("JoseInvalidInput", () => InvalidKey.make({})))

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
 * @see {@link importPrivate} for importing JWK-encoded keys
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
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
      return yield* native(Effect.gen(function*() {
        const key = yield* KeyFormat.decodePrivate(KeyFormat.pkcs8, KeyPolicy.signatureAlgorithm(algorithm), owned)
        return Redacted.make(yield* KeyFormat.encode(KeyFormat.jwk, key))
      }))
    })).pipe(Effect.catchTag("JoseInvalidInput", () => InvalidKey.make({})))

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
 * import { Jwk } from "@effect/auth/Jose"
 * import { Effect, Redacted } from "effect"
 *
 * // Fixed public example material; generate application secrets securely.
 * const secret = Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" })
 * const key = await Effect.runPromise(Jwk.importSecret(secret, "HS256"))
 * key.algorithm // => "HS256"
 * key._tag // => "SecretKey"
 * ```
 *
 * @see {@link exportPrivate}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const importSecret = Effect.fnUntraced(function*(
  input: Redacted.Redacted<unknown>,
  selected: "HS256" | "dir"
): Effect.fn.Return<SecretKey, ImportError> {
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

  return Object.freeze({
    _tag: "SecretKey",
    algorithm,
    jwk: Redacted.make(snapshot(jwk)),
    material: Redacted.make(material)
  }) satisfies SecretKey
})

/**
 * Returns a detached, validated public JWK from an imported key.
 *
 * @see {@link importPublic}
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const exportPublic = Effect.fnUntraced(function*(key: PublicKey) {
  return yield* read(PublicJwk, key.jwk)
})

/**
 * Returns a detached private or symmetric JWK while preserving its redacted wrapper.
 *
 * @see {@link importPrivate}
 * @see {@link importSecret}
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const exportPrivate = Effect.fnUntraced(function*(key: PrivateKey | SecretKey) {
  const value = yield* reveal<PrivateJwk | SecretJwk>(key.jwk).pipe(
    Effect.mapError(() => InvalidKey.make({}))
  )

  return Redacted.make(yield* read(Schema.Union([PrivateJwk, SecretJwk]), value))
})
