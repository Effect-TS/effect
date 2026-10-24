/**
 * Compact JSON Web Tokens whose claims are encoded and decoded with a
 * `Schema`.
 *
 * Verification authenticates the token first, then checks the registered
 * claims and the verification policy, and only then decodes the application
 * claims. `exp` and `nbf` are checked whenever they are present; require them
 * with `requiredClaims`.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Clock from "../Clock.ts"
import type * as Signature from "../crypto/Signature.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import type * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import { fail, invalidToken, millis, parseJsonObject, utf8 } from "./internal/compact.ts"
import * as JoseError from "./JoseError.ts"
import type { PublicKey, SigningKey, VerificationKey } from "./Jwk.ts"
import type { Jwks } from "./Jwks.ts"
import * as Jws from "./Jws.ts"

/**
 * Schema for the registered claims: string `iss`, `sub`, and `jti`, a string
 * or string array `aud`, and finite NumericDate `exp`, `nbf`, and `iat`.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const RegisteredClaims = Schema.Struct({
  iss: Schema.optionalKey(Schema.String),
  sub: Schema.optionalKey(Schema.String),
  aud: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
  exp: Schema.optionalKey(Schema.Finite),
  nbf: Schema.optionalKey(Schema.Finite),
  iat: Schema.optionalKey(Schema.Finite),
  jti: Schema.optionalKey(Schema.String)
})

/**
 * The registered claims of a JWT.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type RegisteredClaims = typeof RegisteredClaims.Type

/**
 * The policy a verified JWT must satisfy.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface VerifyOptions {
  /**
   * Accepted `iss` values.
   */
  readonly issuer?: string | ReadonlyArray<string> | undefined
  /**
   * Accepted audiences. The token's `aud` must contain at least one.
   */
  readonly audience?: string | ReadonlyArray<string> | undefined
  readonly subject?: string | undefined
  /**
   * Expected `typ` header. Media types compare case-insensitively and without
   * the `application/` prefix.
   */
  readonly typ?: string | undefined
  /**
   * Tolerance for `exp`, `nbf`, and `iat`. Defaults to zero; numbers are
   * milliseconds.
   */
  readonly clockTolerance?: Duration.Input | undefined
  /**
   * Maximum age measured from `iat`, which becomes required. Numbers are
   * milliseconds.
   */
  readonly maxTokenAge?: Duration.Input | undefined
  readonly requiredClaims?: ReadonlyArray<keyof RegisteredClaims> | undefined
}

/**
 * Options for {@link verifyWithKeySet}: the verification policy and the
 * accepted algorithms.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface VerifyWithKeySetOptions extends VerifyOptions, Jws.VerifyWithKeySetOptions {}

/**
 * A verified JWT: decoded application claims, its registered claims, and the
 * protected header.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Verified<A> {
  readonly claims: A
  readonly registeredClaims: RegisteredClaims
  readonly protectedHeader: Jws.ProtectedHeader
}

/**
 * The protected header and claims of a JWT that has not been verified.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Unverified {
  readonly protectedHeader: Jws.ProtectedHeader
  readonly claims: Readonly<Record<string, Schema.Json>>
}

/**
 * Failures of JWT operations: JOSE failures, and schema failures while
 * encoding or decoding the application claims.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export type JwtError = JoseError.JoseError | Schema.SchemaError

const claimValidationFailed = (
  claim: JoseError.ClaimValidationFailed["claim"],
  reason: JoseError.ClaimValidationFailed["reason"]
) => fail(new JoseError.ClaimValidationFailed({ claim, reason }))

const isString = (value: unknown): value is string => typeof value === "string"
const isNumericDate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

const registeredClaimGuards: Record<keyof RegisteredClaims, (value: unknown) => boolean> = {
  iss: isString,
  sub: isString,
  aud: (value) => isString(value) || (Array.isArray(value) && value.every(isString)),
  exp: isNumericDate,
  nbf: isNumericDate,
  iat: isNumericDate,
  jti: isString
}

const registeredClaimNames = Object.keys(registeredClaimGuards) as Array<keyof RegisteredClaims>

interface Policy extends Omit<VerifyOptions, "clockTolerance" | "maxTokenAge"> {
  readonly clockTolerance: number
  readonly maxTokenAge: number | undefined
}

// Durations are read before any cryptography, in seconds.
const readPolicy = Effect.fnUntraced(function*(
  options: VerifyOptions | undefined
): Effect.fn.Return<Policy, JoseError.JoseError> {
  const clockTolerance = options?.clockTolerance === undefined
    ? 0
    : yield* millis("clockTolerance", options.clockTolerance)
  const maxTokenAge = options?.maxTokenAge === undefined ? undefined : yield* millis("maxTokenAge", options.maxTokenAge)
  return {
    ...options,
    clockTolerance: clockTolerance / 1000,
    maxTokenAge: maxTokenAge === undefined ? undefined : maxTokenAge / 1000
  }
})

const toArray = (value: string | ReadonlyArray<string>): ReadonlyArray<string> =>
  typeof value === "string" ? [value] : value

const mediaType = (value: string): string => {
  const type = value.toLowerCase()
  return type.includes("/") ? type : `application/${type}`
}

const checkClaims = Effect.fnUntraced(function*(
  claims: Readonly<Record<string, Schema.Json>>,
  header: Jws.ProtectedHeader,
  policy: Policy
): Effect.fn.Return<RegisteredClaims, JoseError.JoseError> {
  const registered: Record<string, unknown> = {}
  for (const name of registeredClaimNames) {
    if (!Object.hasOwn(claims, name)) continue
    if (!registeredClaimGuards[name](claims[name])) return yield* claimValidationFailed(name, "invalid")
    registered[name] = claims[name]
  }
  const { iss, sub, aud, exp, nbf, iat } = registered as RegisteredClaims

  for (const name of policy.requiredClaims ?? []) {
    if (registered[name] === undefined) return yield* claimValidationFailed(name, "missing")
  }
  if (policy.issuer !== undefined) {
    if (iss === undefined) return yield* claimValidationFailed("iss", "missing")
    if (!toArray(policy.issuer).includes(iss)) return yield* claimValidationFailed("iss", "mismatch")
  }
  if (policy.subject !== undefined) {
    if (sub === undefined) return yield* claimValidationFailed("sub", "missing")
    if (sub !== policy.subject) return yield* claimValidationFailed("sub", "mismatch")
  }
  if (policy.audience !== undefined) {
    if (aud === undefined) return yield* claimValidationFailed("aud", "missing")
    const audiences = toArray(aud)
    if (!toArray(policy.audience).some((audience) => audiences.includes(audience))) {
      return yield* claimValidationFailed("aud", "mismatch")
    }
  }
  if (policy.typ !== undefined && (header.typ === undefined || mediaType(header.typ) !== mediaType(policy.typ))) {
    return yield* claimValidationFailed("typ", "mismatch")
  }

  const now = Math.floor((yield* Clock.currentTimeMillis) / 1000)
  const tolerance = policy.clockTolerance
  if (exp !== undefined && exp <= now - tolerance) return yield* claimValidationFailed("exp", "expired")
  if (nbf !== undefined && nbf > now + tolerance) return yield* claimValidationFailed("nbf", "notYetValid")
  if (policy.maxTokenAge !== undefined) {
    if (iat === undefined) return yield* claimValidationFailed("iat", "missing")
    if (iat > now + tolerance) return yield* claimValidationFailed("iat", "future")
    if (now - iat - tolerance > policy.maxTokenAge) return yield* claimValidationFailed("iat", "tooOld")
  }
  return registered as RegisteredClaims
})

const decodeClaims = Effect.fnUntraced(function*<S extends Schema.Constraint>(
  schema: S,
  verified: Jws.Verified,
  policy: Policy
): Effect.fn.Return<Verified<S["Type"]>, JwtError, S["DecodingServices"]> {
  const claims = parseJsonObject(verified.payload)
  if (claims === undefined) return yield* invalidToken("The JWT payload is not a JSON object")
  const registeredClaims = yield* checkClaims(claims, verified.protectedHeader, policy)
  return {
    claims: yield* Schema.decodeUnknownEffect(schema)(claims),
    registeredClaims,
    protectedHeader: verified.protectedHeader
  }
})

const ClaimsJson = Schema.JsonObject.check(Schema.makeFilter((claims) => Schema.is(RegisteredClaims)(claims)))

/**
 * Encodes claims with a schema and signs them as a compact JWT.
 *
 * **Details**
 *
 * The encoded claims must be a JSON object whose registered claims match
 * {@link RegisteredClaims}.
 *
 * @see {@link verify}
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const sign = Effect.fnUntraced(function*<S extends Schema.Constraint>(
  schema: S,
  claims: S["Type"],
  key: SigningKey,
  header?: Jws.Header
): Effect.fn.Return<Redacted.Redacted<string>, JwtError, S["EncodingServices"] | Jws.Requirements> {
  const encoded = yield* Schema.encodeEffect(schema)(claims)
  const json = yield* Schema.decodeUnknownEffect(ClaimsJson)(encoded)
  return yield* Jws.sign(utf8(JSON.stringify(json)), key, header)
})

/**
 * Verifies a compact JWT with a key, checks its claims against the policy, and
 * decodes the claims with a schema.
 *
 * **Example** (Verifying a token)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Redacted, Schema } from "effect"
 * import { Mac, SecureRandom, Signature } from "effect/crypto"
 * import { Jwk, Jwt } from "effect/jose"
 *
 * const layer = Layer.mergeAll(Mac.layerWebCrypto, Signature.layerWebCrypto).pipe(
 *   Layer.provide(SecureRandom.layerWebCrypto)
 * )
 *
 * const Claims = Schema.Struct({ sub: Schema.String, iss: Schema.String })
 *
 * const claims = await Effect.runPromise(Effect.gen(function*() {
 *   // Fixed public example material; generate application secrets securely.
 *   const key = yield* Jwk.importSecret(
 *     Redacted.make({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" } as const),
 *     "HS256"
 *   )
 *   const token = yield* Jwt.sign(Claims, { sub: "user-123", iss: "example" }, key)
 *   const verified = yield* Jwt.verify(Claims, token, key, { issuer: "example", requiredClaims: ["sub"] })
 *   return verified.claims
 * }).pipe(Effect.provide(layer)))
 * claims // => ({ sub: "user-123", iss: "example" })
 * ```
 *
 * @see {@link verifyWithKeySet} for resolving the key from the `Jwks` service
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const verify = Effect.fnUntraced(function*<S extends Schema.Constraint>(
  schema: S,
  token: string | Redacted.Redacted<string>,
  key: VerificationKey,
  options?: VerifyOptions
): Effect.fn.Return<Verified<S["Type"]>, JwtError, S["DecodingServices"] | Jws.Requirements> {
  const policy = yield* readPolicy(options)
  return yield* decodeClaims(schema, yield* Jws.verify(token, key), policy)
})

/**
 * Verifies a compact JWT with a public key resolved from the `Jwks` service,
 * checks its claims against the policy, and decodes the claims with a schema.
 *
 * @see {@link verify} for verifying with a known key
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const verifyWithKeySet = Effect.fnUntraced(function*<S extends Schema.Constraint>(
  schema: S,
  token: string | Redacted.Redacted<string>,
  options: VerifyWithKeySetOptions
): Effect.fn.Return<
  Verified<S["Type"]> & { readonly key: PublicKey },
  JwtError,
  S["DecodingServices"] | Jwks | Signature.Signature
> {
  const policy = yield* readPolicy(options)
  const verified = yield* Jws.verifyWithKeySet(token, options)
  return { ...(yield* decodeClaims(schema, verified, policy)), key: verified.key }
})

/**
 * Reads the protected header and claims of a JWT without verifying it.
 *
 * **Gotchas**
 *
 * Nothing returned here is authenticated. Use it only to choose how to
 * verify, never to authorize.
 *
 * @see {@link verify}
 *
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodeUnverified = Effect.fnUntraced(function*(
  token: string | Redacted.Redacted<string>
): Effect.fn.Return<Unverified, JoseError.JoseError> {
  const parsed = yield* Jws.parse(token)
  const claims = parseJsonObject(parsed.payload)
  if (claims === undefined) return yield* invalidToken("The JWT payload is not a JSON object")
  return { protectedHeader: parsed.protectedHeader, claims }
})
