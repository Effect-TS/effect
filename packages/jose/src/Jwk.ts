/**
 * Schemas, generation, import, and export for algorithm-bound JOSE keys. Private and symmetric material remains redacted.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { InvalidKey } from "./Errors.ts"
import { algorithms } from "./internal/algorithms.ts"
import { decode, reveal } from "./internal/encoding.ts"
import * as KeyInput from "./internal/keyInput.ts"
import * as Signature from "./internal/signature.ts"
import * as SignatureParameters from "./internal/signatureParameters.ts"

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
    modulusLength: Schema.optionalKey(SignatureParameters.RsaModulusLength),
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

/**
 * Generates asymmetric signing JWKs through Web Crypto, keeping private material redacted.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const generateKeyPair = Effect.fnUntraced(function*(input: GenerateKeyPairInput) {
  const value = yield* Schema.decodeEffect(GenerateKeyPairInput)(input).pipe(
    Effect.mapError(() => InvalidKey.make({}))
  )

  return yield* Effect.acquireUseRelease(
    Signature.generateKeyPair({
      algorithm: algorithms[value.algorithm],
      ...("modulusLength" in value ? { modulusLength: value.modulusLength } : {})
    }),
    (pair) =>
      Effect.sync((): GeneratedKeyPair => {
        const parameters = Redacted.value(pair.privateKey)

        const meta = {
          alg: value.algorithm,
          use: "sig" as const,
          ...(value.kid === undefined ? {} : { kid: value.kid })
        }

        switch (parameters.algorithm) {
          case "RSASSA-PKCS1-v1_5-SHA256":
          case "RSA-PSS-SHA256": {
            const publicKey = {
              ...meta,
              kty: "RSA" as const,
              n: Base64Url.encode(parameters.n),
              e: Base64Url.encode(parameters.e)
            }

            return {
              publicKey,
              privateKey: Redacted.make({
                ...publicKey,
                d: Base64Url.encode(parameters.d),
                p: Base64Url.encode(parameters.p),
                q: Base64Url.encode(parameters.q),
                dp: Base64Url.encode(parameters.dp),
                dq: Base64Url.encode(parameters.dq),
                qi: Base64Url.encode(parameters.qi)
              })
            }
          }
          case "ECDSA-P256-SHA256": {
            const publicKey = {
              ...meta,
              kty: "EC" as const,
              crv: "P-256" as const,
              x: Base64Url.encode(parameters.x),
              y: Base64Url.encode(parameters.y)
            }

            return {
              publicKey,
              privateKey: Redacted.make({ ...publicKey, d: Base64Url.encode(parameters.d) })
            }
          }
          case "Ed25519": {
            const publicKey = {
              ...meta,
              kty: "OKP" as const,
              crv: "Ed25519" as const,
              x: Base64Url.encode(parameters.x)
            }

            return {
              publicKey,
              privateKey: Redacted.make({ ...publicKey, d: Base64Url.encode(parameters.d) })
            }
          }
        }
      }),
    (pair) =>
      Effect.sync(() => {
        for (const part of Object.values(Redacted.value(pair.privateKey))) {
          if (typeof part !== "string") part.fill(0)
        }
      })
  )
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

const publicParameters = Effect.fnUntraced(function*(
  jwk: PublicJwk | PrivateJwk,
  algorithm: AsymmetricAlgorithm
): Effect.fn.Return<SignatureParameters.PublicKeyParameters, InvalidKey> {
  if (jwk.alg !== undefined && jwk.alg !== algorithm) return yield* InvalidKey.make({})
  switch (jwk.kty) {
    case "EC":
      if (algorithm !== "ES256") return yield* InvalidKey.make({})

      return { algorithm: "ECDSA-P256-SHA256", x: yield* bytes(jwk.x), y: yield* bytes(jwk.y) }
    case "OKP":
      if (algorithm !== "EdDSA") return yield* InvalidKey.make({})

      return { algorithm: "Ed25519", x: yield* bytes(jwk.x) }
    case "RSA":
      if (algorithm !== "RS256" && algorithm !== "PS256") return yield* InvalidKey.make({})

      return { algorithm: algorithms[algorithm], n: yield* bytes(jwk.n), e: yield* bytes(jwk.e) }
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
) {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)
  const jwk = yield* read(PublicJwk, input)
  const parameters = yield* publicParameters(jwk, algorithm)

  const material = yield* Signature
    .encodePublicKey(parameters)
    .pipe(Effect.catchTag("CryptoInvalidInput", () => InvalidKey.make({})))

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
) {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)

  const jwk = yield* read(
    PrivateJwk,
    yield* reveal(input).pipe(Effect.mapError(() => InvalidKey.make({})))
  )

  const publicPart = yield* publicParameters(jwk, algorithm)
  const d = yield* bytes(jwk.d)

  const parameters = yield* read(SignatureParameters.PrivateKeyParameters, {
    ...publicPart,
    d,
    ...(jwk.kty === "RSA"
      ? {
        p: yield* bytes(jwk.p),
        q: yield* bytes(jwk.q),
        dp: yield* bytes(jwk.dp),
        dq: yield* bytes(jwk.dq),
        qi: yield* bytes(jwk.qi)
      }
      : {})
  })

  const material = yield* Signature.encodePrivateKey(Redacted.make(parameters)).pipe(
    Effect.catchTag("CryptoInvalidInput", () => InvalidKey.make({})),
    Effect.ensuring(
      Effect.sync(() => {
        parameters.d.fill(0)
        if ("p" in parameters) {
          for (
            const part of [
              parameters.p,
              parameters.q,
              parameters.dp,
              parameters.dq,
              parameters.qi
            ]
          ) {
            part.fill(0)
          }
        }
      })
    )
  )

  return Object.freeze({
    _tag: "PrivateKey",
    algorithm,
    jwk: Redacted.make(snapshot(jwk)),
    material
  }) satisfies PrivateKey
})

/**
 * Imports redacted PKCS8 DER through Web Crypto and binds the resulting private key to an algorithm.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const importPkcs8 = Effect.fnUntraced(function*(
  input: Redacted.Redacted<Uint8Array>,
  selected: AsymmetricAlgorithm,
  options?: { readonly kid?: string }
) {
  const algorithm = yield* read(AsymmetricAlgorithm, selected)

  const pair = yield* Signature
    .decodePrivateKey({ algorithm: algorithms[algorithm], privateKey: input })
    .pipe(Effect.mapError(() => InvalidKey.make({})))

  const parameters = Redacted.value(pair.privateKey)

  const meta = {
    alg: algorithm,
    use: "sig" as const,
    ...(options?.kid === undefined ? {} : { kid: options.kid })
  }

  let jwk: PrivateJwk
  switch (parameters.algorithm) {
    case "ECDSA-P256-SHA256":
      jwk = {
        ...meta,
        kty: "EC",
        crv: "P-256",
        x: Base64Url.encode(parameters.x),
        y: Base64Url.encode(parameters.y),
        d: Base64Url.encode(parameters.d)
      }
      break
    case "Ed25519":
      jwk = {
        ...meta,
        kty: "OKP",
        crv: "Ed25519",
        x: Base64Url.encode(parameters.x),
        d: Base64Url.encode(parameters.d)
      }
      break
    default:
      jwk = {
        ...meta,
        kty: "RSA",
        n: Base64Url.encode(parameters.n),
        e: Base64Url.encode(parameters.e),
        d: Base64Url.encode(parameters.d),
        p: Base64Url.encode(parameters.p),
        q: Base64Url.encode(parameters.q),
        dp: Base64Url.encode(parameters.dp),
        dq: Base64Url.encode(parameters.dq),
        qi: Base64Url.encode(parameters.qi)
      }
  }

  return yield* importPrivate(Redacted.make(jwk), algorithm).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        parameters.d.fill(0)
        if ("p" in parameters) {
          for (
            const part of [
              parameters.p,
              parameters.q,
              parameters.dp,
              parameters.dq,
              parameters.qi
            ]
          ) {
            part.fill(0)
          }
        }
      })
    )
  )
})

/**
 * Imports a redacted octet JWK with at least 32 bytes for HS256 or exactly 32 bytes for direct encryption.
 *
 * **Example** (Binding a symmetric signing key)
 *
 * ```ts import.meta.vitest
 * import { Jwk } from "@effect/jose"
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
) {
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
