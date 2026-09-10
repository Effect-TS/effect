/**
 * High-level JSON Web Tokens (RFC 7519) built on the `Jws`, `Jwk`, and `Jwa`
 * modules: compact-serialized, signed with any supported JWS algorithm,
 * verified against a JWK Set with registered-claim validation.
 *
 * Reach for the `Jws` module directly when you need multiple signatures,
 * unprotected headers, critical extension headers, or non-JSON payloads.
 *
 * @since 4.0.0
 */
import * as Data from "../../Data.ts"
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import * as Jwa from "./Jwa.ts"
import * as Jwk from "./Jwk.ts"
import * as Jws from "./Jws.ts"

/**
 * The registered claims (RFC 7519 Section 4.1) carried by a JWT.
 *
 * @category Schema
 * @since 4.0.0
 */
export const RegisteredClaims = Schema.Struct({
  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1 */
  iss: Schema.String,

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2 */
  sub: Schema.String,

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3 */
  aud: Schema.Union([Schema.String, Schema.Array(Schema.String)]),

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 */
  exp: Schema.Number,

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6 */
  iat: Schema.Number,

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5 */
  nbf: Schema.Number.pipe(Schema.optional),

  /** @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 */
  jti: Schema.String.pipe(Schema.optional)
})

/**
 * Registered claims plus a rest record for token-specific claims, which can
 * be decoded with a more specific schema from the claims returned by
 * {@link verify}.
 *
 * @category Schema
 * @since 4.0.0
 */
export const StandardClaims = Schema.StructWithRest(RegisteredClaims, [
  Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Unknown))
])

/**
 * The reasons a JWT can fail verification.
 *
 * @category Errors
 * @since 4.0.0
 */
export type JwtErrorReason =
  | "Malformed"
  | "UnknownKey"
  | "BadAlgorithm"
  | "BadType"
  | "BadSignature"
  | "Expired"
  | "NotYetValid"
  | "BadIssuer"
  | "BadAudience"

/**
 * @category Errors
 * @since 4.0.0
 */
export class JwtError extends Data.TaggedError("JwtError")<{
  readonly reason: JwtErrorReason
}> {}

/** Seconds of clock skew tolerated when validating time claims. */
const clockSkewSeconds = 30

const PayloadFromJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Unknown)))

const ClaimsFromJson = Schema.fromJsonString(StandardClaims)

const HeaderHint = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(
    Schema.fromJsonString(
      Schema.Struct({
        alg: Jwa.JwsAlgorithm,
        kid: Schema.String.pipe(Schema.optional),
        typ: Schema.String.pipe(Schema.optional)
      })
    )
  )
)

/**
 * Generates a fresh ES256 signing key pair with a random `kid`. Persist the
 * private JWK as a secret and publish the public JWK in a JWK Set.
 *
 * @category Keys
 * @since 4.0.0
 */
export const generateSigningKey = Effect.fnUntraced(function*() {
  const pair = yield* Effect.promise(() =>
    crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
  )
  const kid = crypto.randomUUID()
  const privateJwk = yield* Effect.promise(() => crypto.subtle.exportKey("jwk", pair.privateKey))
  const publicJwk = yield* Effect.promise(() => crypto.subtle.exportKey("jwk", pair.publicKey))
  return {
    privateJwk: yield* Schema.decodeUnknownEffect(Jwk.EcPrivateKey)({
      ...privateJwk,
      kid,
      alg: "ES256",
      use: "sig"
    }),
    publicJwk: yield* Schema.decodeUnknownEffect(Jwk.EcPublicKey)({
      ...publicJwk,
      kid,
      alg: "ES256",
      use: "sig"
    })
  }
})

/**
 * Signs a payload as a compact-serialized JWT with the given private JWK,
 * using the key's `alg` (defaulting to ES256) and carrying its `kid` in the
 * protected header.
 *
 * @category Signing
 * @since 4.0.0
 */
export const sign = Effect.fnUntraced(function*(options: {
  readonly privateJwk: (typeof Jwk.EcPrivateKey)["Type"] | (typeof Jwk.RsaPrivateKey)["Type"]
  readonly payload: Record<string, unknown>
}) {
  const algorithm = options.privateJwk.alg ?? "ES256"
  const key = yield* Effect.promise(() =>
    crypto.subtle.importKey("jwk", options.privateJwk as JsonWebKey, Jwa.importParameters(algorithm), false, [
      "sign"
    ])
  )

  const signer = Jws.sign({
    privateKeys: [
      {
        algorithm,
        key,
        header: {
          typ: "JWT",
          ...(options.privateJwk.kid === undefined ? {} : { kid: options.privateJwk.kid })
        }
      }
    ],
    payload: PayloadFromJson
  })

  const flattened = yield* signer(options.payload, {})
  return `${flattened.protected}.${flattened.payload}.${flattened.signature}`
})

/**
 * Verifies a compact-serialized JWT against a JWK Set: signature (any
 * supported JWS algorithm, with `kid`-based key selection), `exp`/`nbf`
 * (with 30s skew), and — when provided — `algorithms`, `types` (the `typ`
 * header), `issuer`, and `audience`.
 *
 * `audience` is validated only when supplied; pass it whenever the token is
 * addressed to a specific recipient. Pinning `algorithms` (e.g. `["ES256"]`)
 * is recommended defence-in-depth. Returns the validated standard claims
 * plus the rest record for decoding token-specific claims with a more
 * precise schema.
 *
 * @category Verification
 * @since 4.0.0
 */
export const verify = Effect.fnUntraced(function*(
  token: string,
  options: {
    readonly jwks: (typeof Jwk.JwkSet)["Type"]
    readonly issuer?: string | undefined
    readonly audience?: string | undefined
    /** When set, only these `alg` values are accepted (e.g. `["ES256"]`). */
    readonly algorithms?: ReadonlyArray<(typeof Jwa.JwsAlgorithm)["Type"]> | undefined
    /** When set, the `typ` header must be present and one of these (e.g. `["at+jwt"]`). */
    readonly types?: ReadonlyArray<string> | undefined
  }
) {
  const flattened = yield* Schema.decodeUnknownEffect(Jws.Compact)(token).pipe(
    Effect.mapError(() => new JwtError({ reason: "Malformed" }))
  )

  const hint = yield* Schema.decodeUnknownEffect(HeaderHint)(flattened.protected).pipe(
    Effect.mapError(() => new JwtError({ reason: "Malformed" }))
  )

  if (options.algorithms !== undefined && !options.algorithms.includes(hint.alg)) {
    return yield* new JwtError({ reason: "BadAlgorithm" })
  }
  if (options.types !== undefined && (hint.typ === undefined || !options.types.includes(hint.typ))) {
    return yield* new JwtError({ reason: "BadType" })
  }

  const candidates = options.jwks.keys
    .filter((jwk) => Jwk.isCompatibleWith(hint.alg, jwk))
    .filter((jwk) => hint.kid === undefined || jwk.kid === undefined || jwk.kid === hint.kid)
  if (candidates.length === 0) return yield* new JwtError({ reason: "UnknownKey" })

  // Import each candidate independently, skipping any key whose material is
  // malformed rather than failing the whole verification — one bad key in an
  // otherwise-valid JWK Set must not deny service to tokens signed by the
  // good keys.
  const imported = yield* Effect.forEach(
    candidates,
    (jwk) =>
      Effect.tryPromise(() =>
        crypto.subtle.importKey("jwk", jwk as JsonWebKey, Jwa.importParameters(hint.alg), false, ["verify"])
      ).pipe(Effect.catch(() => Effect.succeed(null as CryptoKey | null)))
  )
  const publicKeys = imported.filter((key): key is CryptoKey => key !== null)
  if (publicKeys.length === 0) return yield* new JwtError({ reason: "UnknownKey" })

  const result = yield* Jws.verify({ publicKeys, payload: ClaimsFromJson })(flattened).pipe(
    Effect.mapError((error) =>
      error instanceof Jws.InvalidJws
        ? new JwtError({ reason: error.reason._tag === "InvalidSignature" ? "BadSignature" : "Malformed" })
        : new JwtError({ reason: "Malformed" })
    )
  )

  const claims = result.payload
  const nowSeconds = DateTime.toEpochMillis(yield* DateTime.now) / 1000

  if (claims.exp + clockSkewSeconds < nowSeconds) return yield* new JwtError({ reason: "Expired" })
  if (claims.nbf !== undefined && claims.nbf - clockSkewSeconds > nowSeconds) {
    return yield* new JwtError({ reason: "NotYetValid" })
  }
  if (options.issuer !== undefined && claims.iss !== options.issuer) {
    return yield* new JwtError({ reason: "BadIssuer" })
  }
  if (options.audience !== undefined) {
    const audiences = typeof claims.aud === "string" ? [claims.aud] : claims.aud
    if (!audiences.includes(options.audience)) return yield* new JwtError({ reason: "BadAudience" })
  }

  return claims
})
