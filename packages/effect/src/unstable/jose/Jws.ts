/**
 * JSON Web Signature (JWS) schemas based on RFC 7515.
 *
 * This module provides Effect Schema definitions for JWS structures, which
 * represent content secured with digital signatures or Message Authentication
 * Codes (MACs) using JSON-based data structures. All three serializations are
 * supported (Compact, Flattened JSON, General JSON), along with signing and
 * verification built on WebCrypto, extensible critical headers with
 * compile-time key validation, and schema combinators ({@link Verified},
 * {@link Signed}) that treat signing/verification as schema transformations.
 *
 * Keys embedded in the token itself (`jwk` and `jku` header parameters) are
 * IGNORED during verification unless explicitly opted into — an attacker can
 * put any key they control in those headers, so trusting them by default
 * would make signature verification meaningless for authentication use.
 *
 * @since 4.0.0
 */
import type { NonEmptyReadonlyArray } from "../../Array.ts"
import * as Arr from "../../Array.ts"
import type * as Brand from "../../Brand.ts"
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import { flow } from "../../Function.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import type * as Struct from "../../Struct.ts"
import * as Tuple from "../../Tuple.ts"
import * as VariantSchema from "../schema/VariantSchema.ts"
import { importParameters, JwsAlgorithm, signatureParameters } from "./Jwa.ts"
import { isCompatibleWith, isPrivate, isSymmetric, Jwk, JwkSet } from "./Jwk.ts"

const joseVariantSchema = VariantSchema.make({
  variants: ["protected", "unprotected"],
  defaultVariant: "protected"
})

/**
 * JOSE Header for JWS as defined in RFC 7515 Section 4. The JOSE Header
 * describes the cryptographic operations applied to the JWS Protected Header
 * and the JWS Payload.
 *
 * This schema is extensible — additional public and private header parameters
 * are permitted per RFC 7515 Sections 4.2 and 4.3.
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export const JoseHeader = joseVariantSchema.Struct({
  /**
   * "alg" (Algorithm) Header Parameter - REQUIRED Identifies the
   * cryptographic algorithm used to secure the JWS.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.1
   */
  alg: JwsAlgorithm.pipe(
    joseVariantSchema.fieldEvolve({
      unprotected: (algSchema) => Schema.optional(algSchema)
    })
  ),

  /**
   * "jku" (JWK Set URL) Header Parameter - OPTIONAL A URI that refers to a
   * resource for a set of JSON-encoded public keys.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.2
   */
  jku: Schema.String.pipe(Schema.optional),

  /**
   * "jwk" (JSON Web Key) Header Parameter - OPTIONAL The public key that
   * corresponds to the key used to digitally sign the JWS.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.3
   */
  jwk: Jwk.pipe(Schema.optional),

  /**
   * "kid" (Key ID) Header Parameter - OPTIONAL A hint indicating which key
   * was used to secure the JWS.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4
   */
  kid: Schema.String.pipe(Schema.optional),

  /**
   * "x5u" (X.509 URL) Header Parameter - OPTIONAL
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.5
   */
  x5u: Schema.String.pipe(Schema.optional),

  /**
   * "x5c" (X.509 Certificate Chain) Header Parameter - OPTIONAL
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.6
   */
  x5c: Schema.Array(Schema.String).pipe(Schema.optional),

  /**
   * "x5t" (X.509 Certificate SHA-1 Thumbprint) Header Parameter - OPTIONAL
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.7
   */
  x5t: Schema.String.pipe(Schema.optional),

  /**
   * "x5t#S256" (X.509 Certificate SHA-256 Thumbprint) Header Parameter -
   * OPTIONAL
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.8
   */
  "x5t#S256": Schema.String.pipe(Schema.optional),

  /**
   * "typ" (Type) Header Parameter - OPTIONAL (RECOMMENDED to be "JWT" for
   * JWTs) Used to declare the media type of this complete JWS.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.9
   */
  typ: Schema.String.pipe(Schema.optional),

  /**
   * "cty" (Content Type) Header Parameter - OPTIONAL Used to declare the
   * media type of the secured content (the payload). For nested JWTs, this
   * MUST be "JWT".
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.10
   */
  cty: Schema.String.pipe(Schema.optional),

  /**
   * "crit" (Critical) Header Parameter - OPTIONAL Indicates that extensions
   * are being used that MUST be understood and processed.
   *
   * @see https://www.rfc-editor.org/rfc/rfc7515#section-4.1.11
   */
  crit: Schema.Never.pipe(Schema.optionalKey, joseVariantSchema.FieldOnly(["protected"]))
})

/**
 * The integrity-protected JOSE header variant.
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export const JoseProtectedHeader = joseVariantSchema.extract(JoseHeader, "protected")

/**
 * The unprotected JOSE header variant, carried alongside JSON serializations.
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export const JoseUnprotectedHeader = joseVariantSchema.extract(JoseHeader, "unprotected")

/**
 * Additional protected header parameters that callers may set when signing
 * (everything except `alg`, which comes from the signing key entry, and
 * `crit`, which is managed by the critical-header machinery).
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export type ProtectedHeaderExtras = Omit<(typeof JoseProtectedHeader)["Type"], "alg" | "crit">

/**
 * Type-level validation to prevent critical header keys from colliding with
 * registered JOSE header parameters. Critical header keys must be distinct
 * from any registered JOSE header parameter keys, as they would cause
 * ambiguity in the JOSE header structure and violate the JWS specification.
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export type ValidateCriticalHeaderKey<K extends string> = K extends
  | keyof typeof JoseProtectedHeader.fields
  | keyof typeof JoseUnprotectedHeader.fields
  ? `${K} is a registered JOSE header parameter and cannot be used as a critical header key`
  : {}

/**
 * Type-level validation applied to a whole record of critical headers.
 *
 * @category JOSE Header
 * @since 4.0.0
 */
export type ValidateCriticalHeaderKeys<
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  }
> = {
  [K in Extract<keyof CriticalHeaders, string>]: ValidateCriticalHeaderKey<K>
}

/**
 * Adds a critical extension header to a JoseHeader-like struct schema. Each
 * call adds the field, and updates the `crit` field to be an exact tuple of
 * all registered critical header key literals.
 *
 * @internal
 */
const joseHeaderWithCritical = <const K extends string, S extends Schema.Codec<unknown, Schema.Json, unknown, unknown>>(
  key: K & ValidateCriticalHeaderKey<K>,
  schema: S
) => {
  type InputConstraint =
    | typeof JoseProtectedHeader.fields
    | { readonly crit: Schema.$Array<Schema.Union<NonEmptyReadonlyArray<Schema.Literal<string>>>> }

  type ValidateJoseHeaderAndKey<OldFields extends InputConstraint> = OldFields["crit"] extends Schema.$Array<
    Schema.Union<NonEmptyReadonlyArray<Schema.Literal<infer OldCritKeys>>>
  > ? [OldCritKeys] extends [K] ? `Critical header key '${K}' already exists`
    : {}
    : {}

  return <
    OldFields extends InputConstraint,
    NewFields extends
      & {
        readonly [k in K]: S
      }
      & {
        readonly crit: OldFields["crit"] extends Schema.$Array<Schema.Union<infer Elements>>
          ? Schema.$Array<Schema.Union<[...Elements, Schema.Literal<K>]>>
          : Schema.$Array<Schema.Union<NonEmptyReadonlyArray<Schema.Literal<K>>>>
      }
  >(
    self: Schema.Struct<OldFields> & ValidateJoseHeaderAndKey<OldFields>
  ): Schema.Struct<Struct.Simplify<Struct.Assign<OldFields, NewFields>>> => {
    // Before the first augmentation `crit` is `optionalKey<Never>`; afterwards
    // it is an array of a union of the registered key literals.
    const crit: any = self.fields.crit
    const critUnion: any = "value" in crit ? crit.value : undefined
    const existingMembers: ReadonlyArray<any> = critUnion !== undefined && "members" in critUnion
      ? critUnion.members
      : []

    if (existingMembers.some((member) => member.literal === key)) {
      const newFields = { [key]: schema } as unknown as NewFields
      return self.pipe(Schema.fieldsAssign(newFields)) as never
    }

    const keySchema = Schema.Literal(key)
    const prevLength = existingMembers.length

    const critSchema = existingMembers.length > 0
      ? Schema.Array(critUnion.mapMembers(Tuple.appendElement(keySchema)))
      : Schema.Array(Schema.Union([keySchema]))

    const newFields = {
      [key]: schema,
      crit: critSchema.check(
        Schema.isUnique({
          message: "Duplicate critical header keys are not allowed"
        }),
        Schema.isMinLength(prevLength + 1, {
          message: "All critical header keys should be present"
        })
      )
    } as unknown as NewFields

    return self.pipe(Schema.fieldsAssign(newFields))
  }
}

/**
 * Adds a collection of critical extension headers to a JoseHeader-like struct
 * schema. Each call adds the fields, and updates the `crit` field to be an
 * exact tuple of all registered critical header key literals.
 *
 * @internal
 */
const joseHeaderWithCriticals = <
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  }
>(
  criticalHeaders: CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>
) => {
  type KeyLiterals = Extract<keyof CriticalHeaders, string>

  type InputConstraint =
    | typeof JoseProtectedHeader.fields
    | { readonly crit: Schema.$Array<Schema.Union<NonEmptyReadonlyArray<Schema.Literal<string>>>> }

  type ValidateJoseHeaderAndKey<OldFields extends InputConstraint> = OldFields["crit"] extends Schema.$Array<
    Schema.Union<NonEmptyReadonlyArray<Schema.Literal<infer OldCritKeys>>>
  > ? Extract<KeyLiterals, OldCritKeys> extends never ? {}
    : `Critical header key '${Extract<KeyLiterals, OldCritKeys>}' already exists`
    : {}

  return <
    OldFields extends InputConstraint,
    NewCritical extends KeyLiterals extends never ? OldFields["crit"]
      : OldFields["crit"] extends Schema.$Array<Schema.Union<infer Elements>>
        ? Schema.$Array<Schema.Union<[...Elements, Schema.Literal<KeyLiterals>]>>
      : Schema.$Array<Schema.Union<NonEmptyReadonlyArray<Schema.Literal<KeyLiterals>>>>,
    NewFields extends CriticalHeaders & { readonly crit: NewCritical }
  >(
    self: Schema.Struct<OldFields> & ValidateJoseHeaderAndKey<OldFields>
  ): Schema.Struct<Struct.Simplify<Struct.Assign<OldFields, NewFields>>> => {
    let schema = self
    for (const [key, value] of Object.entries(criticalHeaders)) {
      schema = schema.pipe(joseHeaderWithCritical(key, value) as any)
    }
    return schema as any
  }
}

/**
 * General JWS JSON Serialization as defined in RFC 7515 Section 7.2.1.
 * Supports multiple digital signatures and/or MACs for the same payload.
 *
 * @category JWS JSON Serialization
 * @since 4.0.0
 */
export class General extends Schema.Opaque<General, Brand.Brand<"General">>()(
  Schema.Struct({
    unverifiedPayload: Schema.String,
    signatures: Schema.NonEmptyArray(
      Schema.Struct({
        protected: Schema.String,
        signature: Schema.String,
        header: JoseUnprotectedHeader.pipe(Schema.optional)
      })
    )
  })
    .pipe(
      Schema.encodeKeys({
        unverifiedPayload: "payload"
      })
    )
    .annotate({
      title: "JWS General JSON Serialization (Unverified)",
      expected: "a JWS General JSON Serialization object with unverified payload and signatures",
      description: "A JWS in General JSON Serialization format with unverified payload and signatures."
    })
) {}

/**
 * Flattened JWS JSON Serialization as defined in RFC 7515 Section 7.2.2.
 * Optimized for the single digital signature or MAC case — the "signatures"
 * member is flattened into top-level "protected", "header", and "signature"
 * members alongside "payload".
 *
 * @category JWS JSON Serialization
 * @since 4.0.0
 */
export class Flattened extends Schema.Opaque<Flattened, Brand.Brand<"Flattened">>()(
  Schema.Struct({
    signature: Schema.String,
    protected: Schema.String,
    unverifiedPayload: Schema.String,
    header: JoseUnprotectedHeader.pipe(Schema.optional)
  })
    .pipe(
      Schema.encodeKeys({
        unverifiedPayload: "payload"
      })
    )
    .annotate({
      title: "JWS Flattened JSON Serialization (Unverified)",
      expected: "a JWS Flattened JSON Serialization object with unverified payload and signature",
      description: "A JWS in Flattened JSON Serialization format with unverified payload and signature."
    })
) {}

/**
 * JWS Compact Serialization as defined in RFC 7515 Section 7.1. Represents a
 * compact, URL-safe string of the form:
 *
 *     BASE64URL(UTF8(JWS Protected Header)) || '.' ||
 *     BASE64URL(JWS Payload) || '.' ||
 *     BASE64URL(JWS Signature)
 *
 * Only one signature/MAC is supported by the JWS Compact Serialization and it
 * provides no syntax to represent a JWS Unprotected Header value.
 *
 * @category JWS Compact Serialization
 * @since 4.0.0
 */
export class Compact extends Schema.Opaque<Compact, Brand.Brand<"Compact">>()(
  Schema.TemplateLiteralParser([Schema.String, Schema.Literal("."), Schema.String, Schema.Literal("."), Schema.String])
    .pipe(
      Schema.decodeTo(Flattened, {
        decode: SchemaGetter.transform(([protectedHeader, _dot1, payload, _dot2, signature]) => ({
          protected: protectedHeader,
          payload,
          signature
        })),
        encode: SchemaGetter.transformOrFail(({ header, payload, protected: protectedHeader, signature }) =>
          header === undefined
            ? Effect.succeed([protectedHeader, ".", payload, ".", signature] as const)
            : Effect.fail(
              new SchemaIssue.InvalidValue(Option.none(), {
                message: "Compact serialization does not support unprotected headers"
              })
            )
        )
      })
    )
    .annotate({
      title: "JWS Compact Serialization (Unverified)",
      expected: "a JWS Compact Serialization string with unverified payload and signature",
      description: "A JWS in Compact Serialization format with unverified payload and signature."
    })
) {}

/**
 * Any unverified JWS serialization.
 *
 * @category JWS
 * @since 4.0.0
 */
export const Unsecured = Schema.Union([General, Flattened, Compact])

/**
 * @category Errors
 * @since 4.0.0
 */
export class InvalidHeaders extends Data.TaggedError("InvalidHeaders")<{}> {}

/**
 * @category Errors
 * @since 4.0.0
 */
export class InvalidSignature extends Data.TaggedError("InvalidSignature")<{}> {}

/**
 * @category Errors
 * @since 4.0.0
 */
export class InvalidJws extends Data.TaggedError("InvalidJws")<{ reason: InvalidHeaders | InvalidSignature }> {}

/**
 * Builds a JWS verifier. Signatures are checked against the provided
 * `publicKeys`. Keys embedded in the token (`jwk` header) are only considered
 * when `trustEmbeddedJwk` is set, and `jku` URLs are only followed when a
 * `resolveJku` effect is supplied — both default to off because tokens choose
 * their own headers.
 *
 * @category JWS
 * @since 4.0.0
 */
export function verify<
  A = string,
  RD1 = never,
  E2 = never,
  R2 = never,
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  } = {}
>({
  algorithms,
  criticalHeaders,
  maxSignatures = 4,
  payload,
  publicKeys,
  resolveJku,
  trustEmbeddedJwk
}: {
  payload?: Schema.Codec<A, string, RD1, unknown> | undefined
  publicKeys?: ReadonlyArray<CryptoKey> | undefined
  trustEmbeddedJwk?: boolean | undefined
  resolveJku?: ((url: string) => Effect.Effect<(typeof JwkSet)["Type"], E2, R2>) | undefined
  criticalHeaders?: (CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>) | undefined
  /**
   * When set, only these `alg` values are accepted; a token selecting any
   * other algorithm is rejected before key selection. Strongly recommended:
   * pinning the algorithm is defence-in-depth against downgrade and
   * key-type-confusion attacks.
   */
  algorithms?: ReadonlyArray<(typeof JwsAlgorithm)["Type"]> | undefined
  /**
   * Maximum number of signatures accepted in a General JSON serialization
   * (defaults to 4). Bounds the per-token verification work an attacker can
   * force, including `jku` fetches.
   */
  maxSignatures?: number | undefined
}) {
  const keys = Arr.fromIterable(publicKeys ?? [])
  const textEncoder = new TextEncoder()

  const defaultPayloadSchema = Schema.String as unknown as Schema.Codec<A, string, RD1, unknown>
  const defaultCritical = {} as CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>

  const payloadSchema = Schema.StringFromBase64Url.pipe(Schema.decodeTo(payload ?? defaultPayloadSchema))
  const joseProtectedSchema = JoseProtectedHeader.pipe(joseHeaderWithCriticals(criticalHeaders ?? defaultCritical))
  const protectedHeaderSchema = Schema.StringFromBase64Url.pipe(
    Schema.decodeTo(Schema.fromJsonString(joseProtectedSchema))
  )

  const decodePayload = Schema.decodeEffect(payloadSchema)
  const decodeProtectedHeader = Schema.decodeEffect(protectedHeaderSchema)
  const decodeSignature = Schema.decodeEffect(Schema.Uint8ArrayFromBase64Url)

  // Import may reject on malformed key material or an alg/key-type mismatch;
  // treat that as "unusable key" (null) rather than an unrecoverable defect.
  const importJwk = (jwk: (typeof Jwk)["Type"], alg: (typeof JwsAlgorithm)["Type"]) =>
    Effect.tryPromise(() => crypto.subtle.importKey("jwk", jwk as JsonWebKey, importParameters(alg), false, ["verify"]))
      .pipe(Effect.catch(() => Effect.succeed(null as CryptoKey | null)))

  const verifier = Effect.fnUntraced(function*(jws: General) {
    if (jws.signatures.length > maxSignatures) {
      return yield* new InvalidJws({ reason: new InvalidHeaders() })
    }
    for (const signatureEntry of jws.signatures) {
      const signatureBytes = yield* decodeSignature(signatureEntry.signature)
      const protectedHeader = yield* decodeProtectedHeader(signatureEntry.protected)

      const header = { ...signatureEntry.header, ...protectedHeader }
      const protectedKeys = Object.keys(protectedHeader ?? {})
      const unprotectedKeys = new Set(Object.keys(signatureEntry.header ?? {}))
      if (protectedKeys.some((key) => unprotectedKeys.has(key))) {
        return yield* new InvalidJws({ reason: new InvalidHeaders() })
      }

      if (header.alg === undefined) {
        return yield* new InvalidJws({ reason: new InvalidHeaders() })
      }

      if (algorithms !== undefined && !algorithms.includes(header.alg)) {
        return yield* new InvalidJws({ reason: new InvalidHeaders() })
      }

      const localKeys: Array<CryptoKey> = []

      // Keys pulled from the token itself (jku URL / embedded jwk) are only
      // trusted when the caller opts in, and even then a key is used only if
      // it is an asymmetric public key compatible with the header algorithm —
      // never a symmetric or private key, which would enable forgery.
      const trustable = (jwk: (typeof Jwk)["Type"]) =>
        !isSymmetric(jwk) && !isPrivate(jwk) && isCompatibleWith(header.alg!, jwk)

      if (header.jku !== undefined && resolveJku !== undefined) {
        const jwkSet = yield* resolveJku(header.jku).pipe(
          Effect.mapError(() => new InvalidJws({ reason: new InvalidHeaders() }))
        )
        for (const jwk of jwkSet.keys) {
          if (!trustable(jwk)) continue
          const imported = yield* importJwk(jwk, header.alg)
          if (imported !== null) localKeys.push(imported)
        }
      }

      if (header.jwk !== undefined && trustEmbeddedJwk === true && trustable(header.jwk)) {
        const imported = yield* importJwk(header.jwk, header.alg)
        if (imported !== null) localKeys.push(imported)
      }

      const verifyParameters = signatureParameters(header.alg)
      for (const key of [...keys, ...localKeys]) {
        // A key whose bound algorithm does not match makes crypto.subtle.verify
        // reject; treat that (and any other failure) as "did not verify" so the
        // next candidate is tried and verification stays fail-closed.
        const verified = yield* Effect.tryPromise(() =>
          crypto.subtle.verify(
            verifyParameters,
            key,
            Uint8Array.from(signatureBytes),
            textEncoder.encode(`${signatureEntry.protected}.${jws.unverifiedPayload}`)
          )
        ).pipe(Effect.catch(() => Effect.succeed(false)))

        if (verified) {
          return {
            signature: signatureBytes,
            protected: protectedHeader,
            header: signatureEntry.header,
            payload: yield* decodePayload(jws.unverifiedPayload)
          }
        }
      }
    }

    return yield* new InvalidJws({
      reason: new InvalidSignature()
    })
  })

  return (jws: (typeof Unsecured)["Type"]) => {
    if ("signatures" in jws) {
      return verifier(jws)
    }

    const intoGeneral = General.make({
      unverifiedPayload: jws.unverifiedPayload,
      signatures: [
        {
          header: jws.header,
          protected: jws.protected,
          signature: jws.signature
        }
      ]
    })

    return verifier(intoGeneral)
  }
}

/**
 * Builds a JWS signer. Each private key entry carries its algorithm and any
 * additional protected header parameters (e.g. `kid`, `typ`). Signing with a
 * single key produces the Flattened serialization; multiple keys produce the
 * General serialization.
 *
 * @category JWS
 * @since 4.0.0
 */
export function sign<
  A = string,
  RE1 = never,
  PrivateKeys extends NonEmptyReadonlyArray<{
    algorithm: (typeof JwsAlgorithm)["Type"]
    key: CryptoKey
    header?: ProtectedHeaderExtras | undefined
  }> = never,
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  } = {}
>(options: {
  privateKeys: PrivateKeys
  payload?: Schema.Codec<A, string, unknown, RE1> | undefined
  criticalHeaders?: (CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>) | undefined
}): (
  payload: A,
  criticalHeaders: Schema.Struct.Type<CriticalHeaders>
) => Effect.Effect<
  PrivateKeys extends [infer _] ? (typeof Flattened)["Encoded"] : (typeof General)["Encoded"],
  Schema.SchemaError,
  RE1 | Schema.Struct.EncodingServices<CriticalHeaders>
> {
  const textEncoder = new TextEncoder()
  const defaultCritical = {} as CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>

  const payloadSchema = Schema.StringFromBase64Url.pipe(Schema.decodeTo(options.payload ?? Schema.String))
  const joseSchema = JoseProtectedHeader.pipe(joseHeaderWithCriticals(options.criticalHeaders ?? defaultCritical))
  const protectedHeaderSchema = Schema.StringFromBase64Url.pipe(
    Schema.decodeTo(Schema.fromJsonString(joseSchema))
  )

  const encodePayload = Schema.encodeEffect(payloadSchema)
  const encodeProtected = Schema.encodeEffect(protectedHeaderSchema)
  const encodeSignature = Schema.encodeEffect(Schema.Uint8ArrayFromBase64Url)

  const signMany = (
    encodedPayload: string,
    criticalHeaders: Schema.Struct.Type<CriticalHeaders>,
    privateKeys: NonEmptyReadonlyArray<{
      algorithm: (typeof JwsAlgorithm)["Type"]
      key: CryptoKey
      header?: ProtectedHeaderExtras | undefined
    }>
  ) =>
    Effect.forEach(
      privateKeys,
      Effect.fnUntraced(function*({ algorithm, header, key }) {
        // RFC 7515 Section 4.1.11: the `crit` header lists the extension
        // parameter names in use, so it is derived from the critical headers.
        const critKeys = Object.keys(criticalHeaders as Record<string, unknown>)
        const protectedHeader = yield* encodeProtected({
          alg: algorithm as any,
          ...header,
          ...(critKeys.length > 0 ? { crit: critKeys } : {}),
          ...criticalHeaders
        } as any)
        const signature = yield* Effect.promise(() =>
          crypto.subtle.sign(
            signatureParameters(algorithm),
            key,
            textEncoder.encode(`${protectedHeader}.${encodedPayload}`)
          )
        )
        return {
          protected: protectedHeader,
          signature: yield* encodeSignature(new Uint8Array(signature))
        }
      })
    )

  return Effect.fnUntraced(function*(payload: A, criticalHeaders: Schema.Struct.Type<CriticalHeaders>) {
    const encodedPayload = yield* encodePayload(payload)
    const signatures = yield* signMany(encodedPayload, criticalHeaders, options.privateKeys)
    type Ret = PrivateKeys extends [infer _] ? (typeof Flattened)["Encoded"] : (typeof General)["Encoded"]
    return options.privateKeys.length === 1
      ? ((yield* Schema.encodeEffect(Flattened)(
        Flattened.make({
          unverifiedPayload: encodedPayload,
          protected: Arr.headNonEmpty(signatures).protected,
          signature: Arr.headNonEmpty(signatures).signature
        })
      )) as Ret)
      : ((yield* Schema.encodeEffect(General)(
        General.make({
          unverifiedPayload: encodedPayload,
          signatures
        })
      )) as Ret)
  })
}

/**
 * Schema combinator that decodes an unverified JWS into its verified payload
 * and headers, failing decode when no signature verifies. Encoding is
 * forbidden — use {@link Signed} to produce a JWS.
 *
 * @category Schema Combinators
 * @since 4.0.0
 */
export function Verified<
  A = string,
  RD1 = never,
  RE1 = never,
  E2 = never,
  R2 = never,
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  } = {}
>(options: {
  payload?: Schema.Codec<A, string, RD1, RE1> | undefined
  publicKeys?: ReadonlyArray<CryptoKey> | undefined
  trustEmbeddedJwk?: boolean | undefined
  resolveJku?: ((url: string) => Effect.Effect<(typeof JwkSet)["Type"], E2, R2>) | undefined
  criticalHeaders?: (CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>) | undefined
}) {
  const verifier = verify(options)
  const defaultPayloadSchema = Schema.String as unknown as Schema.Codec<A, string, RD1, RE1>
  const defaultCritical = {} as CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>

  const to = Schema.Struct({
    signature: Schema.Uint8ArrayFromBase64Url,
    payload: options.payload ?? defaultPayloadSchema,
    header: JoseUnprotectedHeader.pipe(Schema.optional),
    protected: JoseProtectedHeader.pipe(joseHeaderWithCriticals(options.criticalHeaders ?? defaultCritical))
  }).pipe(Schema.toType)

  const decode = flow(
    verifier,
    Effect.mapError((error) => (Schema.isSchemaError(error) ? error.issue : error)),
    Effect.catchTag("InvalidJws", (_error) =>
      Effect.fail(
        new SchemaIssue.Forbidden(Option.none(), {
          message: "Invalid JWS"
        })
      ))
  )

  return <From extends (typeof Unsecured)["members"][number] | Schema.Decoder<(typeof Unsecured)["Type"], unknown>>(
    from: From
  ) => {
    return (from as From).pipe(
      Schema.decodeTo(to, {
        decode: SchemaGetter.transformOrFail(decode) as never,
        encode: SchemaGetter.forbidden(() => "Will not encode")
      })
    )
  }
}

/**
 * Schema combinator that signs a payload (and critical headers) during
 * decode, producing an unverified JWS serialization. Encoding is forbidden.
 *
 * @category Schema Combinators
 * @since 4.0.0
 */
export function Signed<
  A = string,
  RD1 = never,
  RE1 = never,
  PrivateKeys extends NonEmptyReadonlyArray<{
    algorithm: (typeof JwsAlgorithm)["Type"]
    key: CryptoKey
    header?: ProtectedHeaderExtras | undefined
  }> = never,
  CriticalHeaders extends {
    readonly [K in string]: Schema.Codec<unknown, Schema.Json, unknown, unknown>
  } = {}
>(options: {
  privateKeys: PrivateKeys
  payload?: Schema.Codec<A, string, RD1, RE1> | undefined
  criticalHeaders?: (CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>) | undefined
}) {
  const signer = sign<A, RE1, PrivateKeys, CriticalHeaders>(options)
  const defaultPayloadSchema = Schema.String as unknown as Schema.Codec<A, string, RD1, RE1>

  const from = Schema.Struct({
    payload: options.payload ?? defaultPayloadSchema,
    ...(options.criticalHeaders ? { criticalHeaders: Schema.Struct(options.criticalHeaders) } : {})
  }) as Schema.Struct<
    & {
      readonly payload: Schema.Codec<A, string, RD1, RE1>
    }
    & ([{}] extends [CriticalHeaders] ? {}
      : {
        readonly criticalHeaders: Schema.Struct<
          CriticalHeaders & ValidateCriticalHeaderKeys<CriticalHeaders>
        >
      })
  >

  return <To extends (typeof Unsecured)["members"][number] | Schema.Decoder<(typeof Unsecured)["Type"], unknown>>(
    to: To
  ) => {
    return from.pipe(
      Schema.decodeTo(to as To, {
        encode: SchemaGetter.forbidden(() => "Will not encode"),
        decode: SchemaGetter.transformOrFail((input: any) =>
          Effect.mapError(
            signer(input.payload, input.criticalHeaders),
            (error) => Schema.isSchemaError(error) ? error.issue : error
          )
        )
      })
    )
  }
}
