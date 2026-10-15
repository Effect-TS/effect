/**
 * Signed OpenID Connect ID-token verification and trusted-issuer discovery with scoped JWKS ownership.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Sha2 from "effect/crypto/Sha2"
import * as DateTime from "effect/DateTime"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Ownership from "./internal/ownership.ts"
import * as Transport from "./internal/transport.ts"
import * as Validation from "./internal/validation.ts"
import * as Jwk from "./Jose/Jwk.ts"
import * as Jwks from "./Jose/Jwks.ts"
import * as Jwt from "./Jose/Jwt.ts"
import { JsonObject, Metadata, type RequestOptions } from "./OAuth.ts"
import { ConfigurationError, Rejected, Unavailable } from "./OAuthError.ts"

/**
 * Supported ID-token signing algorithms. HS256 requires explicit opt-in and a client secret of at least 32 UTF-8 bytes.
 *
 * **Example** (Checking an accepted signing algorithm)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 * import { Schema } from "effect"
 *
 * Schema.is(Oidc.IdTokenAlgorithm)("RS256") // => true
 * Schema.is(Oidc.IdTokenAlgorithm)("none") // => false
 * ```
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const IdTokenAlgorithm = Schema.Literals(["RS256", "PS256", "ES256", "EdDSA", "HS256"])
/**
 * Value described by the IdTokenAlgorithm schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type IdTokenAlgorithm = typeof IdTokenAlgorithm.Type

/**
 * Default asymmetric ID-token algorithms: RS256, PS256, ES256, and EdDSA. Discovery must advertise an accepted algorithm.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.5
 */
export const defaultIdTokenAlgorithms: ReadonlyArray<IdTokenAlgorithm> = [
  "RS256",
  "PS256",
  "ES256",
  "EdDSA"
]

const idTokenAlgorithms: ReadonlyArray<IdTokenAlgorithm> = [
  "RS256",
  "PS256",
  "ES256",
  "EdDSA",
  "HS256"
]

/**
 * Trusted-issuer discovery request bounds and an optional explicit metadata document URL.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface DiscoverOptions extends RequestOptions {
  /**
   * Fetch this document instead of issuer + `/.well-known/openid-configuration`.
   * The document issuer must still equal the trusted issuer identifier.
   */
  readonly metadataUrl?: string
}

/**
 * Installed metadata, audience, accepted signing algorithms, PKCE policy, and optional HS256 client secret.
 *
 * @see {@link makeVerifier}
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface VerifierOptions extends RequestOptions {
  readonly metadata: Metadata
  readonly clientId: string
  /**
   * Algorithms this verifier will accept. Discovery must advertise at least one.
   * Defaults to RS256, PS256, ES256 and EdDSA. HS256 is accepted only when
   * requested here and a client secret is supplied.
   */
  readonly algorithms?: ReadonlyArray<IdTokenAlgorithm>
  /**
   * Requires advertised S256 PKCE. Defaults to true. Set false only for issuers
   * that cannot complete authorization-code + PKCE.
   */
  readonly pkceS256?: boolean
  /**
   * Channel or client secret used as the HS256 HMAC key. Required when the
   * advertised algorithm set is HS256.
   */
  readonly clientSecret?: Redacted.Redacted<string>
}

/**
 * Captured verification start, original nonce, optional hash-bound tokens, and prior identity when verifying a refresh continuation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface VerificationInput {
  readonly verificationStartedAt: DateTime.Utc
  readonly nonce: Redacted.Redacted<string>
  /**
   * Maximum authentication age for initial verification, in whole seconds from zero through 24 hours.
   * Numeric inputs are milliseconds. Omit to skip this age limit; refresh continuity does not apply it.
   */
  readonly maxAge?: Duration.Input
  readonly accessToken?: Redacted.Redacted<string>
  readonly code?: Redacted.Redacted<string>
  /**
   * Refresh continuation: same subject, optional nonce must match, `auth_time` cannot change.
   * A `{tenantid}` metadata issuer also requires the original token `iss`.
   */
  readonly previous?: {
    readonly subject: string
    readonly authTime?: number
    readonly issuer?: string
  }
}

/**
 * Authenticated subject and private claims. Authentication time is clamped to the captured verification start when present.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Verified {
  readonly claims: Redacted.Redacted<JsonObject>
  readonly subject: string
  readonly authTime?: number
  readonly upstreamAuthenticatedAt?: DateTime.Utc
}

type VerificationRequirements =
  | Effect.Services<ReturnType<typeof Jwt.verify<typeof JsonObject>>>
  | Exclude<Effect.Services<ReturnType<typeof Jwt.verifyWithKeySet<typeof JsonObject>>>, Jwks.Jwks>
  | Sha2.Sha2

/**
 * A scoped ID-token verifier. Signature and key failures remain unknown outcomes; authenticated invalid claims are definite rejections.
 *
 * **Details**
 *
 * Verification requires Sha2 for hash bindings and the native Hmac, Rsa, Ecdsa,
 * and Ed25519 services used by JOSE. HTTP and Scope are captured at installation.
 *
 * @see {@link makeVerifier}
 * @see {@link VerificationInput}
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Verifier {
  readonly verify: (
    token: Redacted.Redacted<string>,
    input: VerificationInput
  ) => Effect.Effect<Verified, Rejected | Unavailable, VerificationRequirements>
}

const Configuration = Schema.Struct({
  metadata: Metadata,
  clientId: Validation.text(1024),
  ...Validation.RequestOptions.fields,
  algorithms: Schema.optionalKey(
    Schema.Array(IdTokenAlgorithm).check(Schema.isMinLength(1), Schema.isMaxLength(5))
  ),
  pkceS256: Schema.optionalKey(Schema.Boolean),
  clientSecret: Schema.optionalKey(Validation.secret(4096))
})

const VerifyInput = Schema.Struct({
  verificationStartedAt: Schema.DateTimeUtc,
  nonce: Validation.secret(256),
  maxAge: Schema.optional(Validation.MaxAge),
  accessToken: Schema.optional(Validation.secret(16384)),
  code: Schema.optional(Validation.secret(16384)),
  previous: Schema.optional(
    Schema.Struct({
      subject: Validation.text(1024),
      authTime: Schema.optional(Validation.NumericDate),
      /** Original token `iss`. Required when the metadata issuer is a `{tenantid}` template. */
      issuer: Schema.optional(Validation.text(2048))
    })
  )
})

const IdClaims = Schema.Struct({
  iss: Validation.text(2048),
  sub: Validation.text(1024),
  aud: Schema.Union([
    Validation.text(1024),
    Schema.Array(Validation.text(1024)).check(Schema.isMinLength(1), Schema.isMaxLength(1))
  ]),
  azp: Schema.optionalKey(Validation.text(1024)),
  exp: Validation.NumericDate,
  iat: Validation.NumericDate,
  nbf: Schema.optionalKey(Validation.NumericDate),
  auth_time: Schema.optionalKey(Validation.NumericDate),
  nonce: Schema.optionalKey(Validation.text(256)),
  // Leftmost half of the signing-algorithm hash, unpadded base64url: 22
  // characters for SHA-256 (RS256, PS256, ES256, HS256) and 43 for SHA-512 (Ed25519).
  at_hash: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{22}(?:[A-Za-z0-9_-]{21})?$/u))
  ),
  c_hash: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{22}(?:[A-Za-z0-9_-]{21})?$/u))
  )
})

function tokenHash(
  algorithm: string
): { readonly digest: Sha2.Algorithm; readonly octets: number } | undefined {
  switch (algorithm) {
    case "EdDSA":
      return { digest: "SHA-512", octets: 32 }
    case "RS256":
    case "PS256":
    case "ES256":
    case "HS256":
      return { digest: "SHA-256", octets: 16 }
    default:
      return undefined
  }
}

const tenantPlaceholder = "{tenantid}"

const TenantId = Schema.String.check(
  Schema.isPattern(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u
  )
)

const issuerOriginAndPath = (value: string) => {
  const match = /^(https:\/\/[^/?#]+)(\/[^?#]*)?$/u.exec(value)

  if (match === null) return undefined

  const origin = match[1]

  return origin === undefined ? undefined : { origin, path: match[2] ?? "" }
}

/**
 * Returns whether `issuer` has exactly one `{tenantid}` path segment. The URL parser
 * percent-encodes braces, so matching stays on the raw identifier.
 *
 * **Example** (Recognizing a tenant path template)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 *
 * Oidc.isTenantIssuerTemplate("https://login.example/{tenantid}/v2.0") // => true
 * Oidc.isTenantIssuerTemplate("https://login.example/tenantid/v2.0") // => false
 * ```
 *
 * @see {@link substituteTenantIssuer}
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.5
 */
export const isTenantIssuerTemplate = (issuer: string): boolean => {
  const parts = issuerOriginAndPath(issuer)

  return (
    parts !== undefined &&
    parts.path.split("/").filter((segment) => segment === tenantPlaceholder).length === 1
  )
}

/**
 * Substitutes a GUID tenant identifier into exactly one complete {tenantid} path segment; returns undefined for invalid input.
 *
 * **Example** (Pinning a tenant issuer)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 *
 * const issuer = Oidc.substituteTenantIssuer(
 *   "https://login.example/{tenantid}/v2.0",
 *   "11111111-1111-1111-1111-111111111111"
 * )
 * issuer // => "https://login.example/11111111-1111-1111-1111-111111111111/v2.0"
 * Oidc.substituteTenantIssuer("https://login.example/{tenantid}/v2.0", "common") // => undefined
 * ```
 *
 * @see {@link isTenantIssuerTemplate}
 *
 * @stability unstable
 * @category mapping
 * @since 4.0.5
 */
export const substituteTenantIssuer = (template: string, tenantId: string): string | undefined => {
  if (!Schema.is(TenantId)(tenantId)) return undefined

  const parts = issuerOriginAndPath(template)

  if (parts === undefined) return undefined

  const segments = parts.path.split("/")
  const index = segments.indexOf(tenantPlaceholder)

  if (index < 0 || segments.filter((segment) => segment === tenantPlaceholder).length !== 1) {
    return undefined
  }

  segments[index] = tenantId

  return `${parts.origin}${segments.join("/")}`
}

/** Commercial personal-account tenant. `consumers` is this GUID's nickname. */
const personalMicrosoftAccountTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"

const multiTenantAlias = (segment: string) => segment === "common" || segment === "organizations"

/** Replace one `consumers` segment on the commercial host with its tenant GUID. */
const personalAccountIssuer = (configured: string): string | undefined => {
  const parts = issuerOriginAndPath(configured)

  if (parts === undefined || parts.origin !== "https://login.microsoftonline.com") return undefined

  const segments = parts.path.split("/")
  const index = segments.indexOf("consumers")

  if (index < 0 || segments.filter((segment) => segment === "consumers").length !== 1) {
    return undefined
  }

  segments[index] = personalMicrosoftAccountTenant

  return `${parts.origin}${segments.join("/")}`
}

/** Tenant segment when `discovered` is a `{tenantid}` template of `configured`. */
const templateTenantSegment = (configured: string, discovered: string): string | undefined => {
  if (configured === discovered || !isTenantIssuerTemplate(discovered)) return undefined

  const configuredParts = issuerOriginAndPath(configured)
  const discoveredParts = issuerOriginAndPath(discovered)

  if (configuredParts === undefined || discoveredParts === undefined) return undefined
  if (configuredParts.origin !== discoveredParts.origin) return undefined

  const configuredSegments = configuredParts.path.split("/")
  const discoveredSegments = discoveredParts.path.split("/")

  if (configuredSegments.length !== discoveredSegments.length) return undefined

  const index = discoveredSegments.indexOf(tenantPlaceholder)
  const tenant = configuredSegments[index]

  if (tenant === undefined || tenant === "" || tenant === tenantPlaceholder) return undefined

  const filled = discoveredSegments.map((segment) => segment === tenantPlaceholder ? tenant : segment)

  return filled.every((segment, segmentIndex) => segment === configuredSegments[segmentIndex]) &&
      `${discoveredParts.origin}${filled.join("/")}` === configured
    ? tenant
    : undefined
}

/**
 * Checks for an exact issuer match, or a `{tenantid}` template whose remaining path and origin
 * equal the configured authority once that segment is filled from the authority.
 * `common` and `organizations` may use that template. A GUID segment, and
 * commercial `consumers`, stay restricted to one tenant. Other segments,
 * including a tenant domain, do not match.
 *
 * **Example** (Checking the exact issuer authority)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 *
 * Oidc.discoveredIssuerMatches("https://issuer.example", "https://issuer.example") // => true
 * Oidc.discoveredIssuerMatches("https://issuer.example/", "https://issuer.example") // => false
 * Oidc.discoveredIssuerMatches("https://issuer.example", "https://other.example") // => false
 * ```
 *
 * @see {@link discover}
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.5
 */
export const discoveredIssuerMatches = (configured: string, discovered: string): boolean => {
  if (configured === discovered) return true

  const personal = personalAccountIssuer(configured)

  if (personal !== undefined && personal === discovered) return true

  const tenant = templateTenantSegment(configured, discovered)

  return (
    tenant !== undefined &&
    (Schema.is(TenantId)(tenant) || multiTenantAlias(tenant) || personal !== undefined)
  )
}

/** A single-tenant authority that matched a broader `{tenantid}` document.
 * `common` and `organizations` stay on the template. */
const pinnedConcreteIssuer = (configured: string, discovered: string): string | undefined => {
  const tenant = templateTenantSegment(configured, discovered)

  if (tenant === undefined || multiTenantAlias(tenant)) return undefined
  if (Schema.is(TenantId)(tenant)) return configured

  return personalAccountIssuer(configured)
}

const DiscoverConfiguration = Schema.Struct({
  ...Validation.RequestOptions.fields,
  metadataUrl: Schema.optionalKey(Validation.Endpoint)
})

/**
 * Discovers metadata using the trusted issuer identifier, retaining its exact
 * spelling even if its network URL normalizes. A discovered
 * `{tenantid}` path segment is accepted when it templates this same authority.
 * A GUID authority keeps that issuer. Commercial `consumers` keeps the
 * personal-account issuer. `common` and `organizations` stay on the template.
 * Any other segment is rejected, so a tenant domain does not become common.
 *
 * **Example** (Discovering metadata through an explicit HTTP client)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 * import { Effect } from "effect"
 * import { HttpClient, HttpClientResponse } from "effect/http"
 *
 * const http = HttpClient.make((request) => Effect.succeed(
 *   HttpClientResponse.fromWeb(request, Response.json({
 *     issuer: "https://issuer.example",
 *     authorization_endpoint: "https://issuer.example/authorize",
 *     token_endpoint: "https://issuer.example/token"
 *   }))
 * ))
 * const metadata = await Effect.runPromise(
 *   Oidc.discover("https://issuer.example", { timeout: "5 seconds" }).pipe(
 *     Effect.provideService(HttpClient.HttpClient, http)
 *   )
 * )
 * metadata.issuer // => "https://issuer.example"
 * ```
 *
 * @see {@link makeVerifier} for installing a verifier from trusted metadata
 *
 * @stability unstable
 * @category discovery
 * @since 4.0.5
 */
export const discover = Effect.fnUntraced(function*(
  input: string,
  inputOptions: DiscoverOptions
): Effect.fn.Return<Metadata, ConfigurationError | Unavailable, HttpClient.HttpClient> {
  const issuer = yield* Validation.configuration(Validation.Issuer, input, "issuer")

  const options = yield* Validation.configuration(DiscoverConfiguration, inputOptions)
  const url = new URL(options.metadataUrl ?? issuer)

  if (options.metadataUrl === undefined) {
    url.pathname = `${url.pathname.replace(/\/$/u, "")}/.well-known/openid-configuration`
  }

  const http = yield* Transport.capture

  const response = yield* Transport.request(
    http,
    HttpClientRequest.get(url.href).pipe(HttpClientRequest.acceptJson),
    options
  )

  if (response.status !== 200) return yield* Unavailable.make({})
  const document = yield* Transport.json(response)
  const metadata = yield* Validation.configuration(Metadata, yield* Validation.reveal(document.body), "metadata")

  if (!discoveredIssuerMatches(issuer, metadata.issuer)) {
    return yield* ConfigurationError.make({ reason: "issuer" })
  }

  const segment = templateTenantSegment(issuer, metadata.issuer)
  const pinned = pinnedConcreteIssuer(issuer, metadata.issuer)

  if (segment !== undefined && !multiTenantAlias(segment) && pinned === undefined) {
    return yield* ConfigurationError.make({ reason: "issuer" })
  }

  const accepted = pinned === undefined
    ? metadata
    : yield* Validation.configuration(
      Metadata,
      { ...metadata, issuer: pinned, signing_key_issuer_required: true },
      "metadata"
    )

  return Validation.freeze(accepted)
})

function claimFailure(): Rejected {
  return Rejected.make({ reason: "claims" })
}

/**
 * Creates a scoped verifier for signed ID tokens using advertised RS256, PS256, ES256, EdDSA, or explicit
 * HS256. Asymmetric verification and the bounded JWKS cache belong to the
 * caller's Scope. HS256 uses the supplied client secret as the HMAC key and
 * does not install JWKS. Owner closure cancels and joins active verification,
 * returning Unavailable; caller interruption joins its operation without
 * closing the verifier. No process cache or automatic exchange retry is created.
 *
 * **Details**
 *
 * Installation captures HttpClient and Scope. Each verification uses its caller's
 * Sha2 and JOSE algorithm services; NodeCrypto.layer supplies all of them on Node.js.
 * Native hashing is joined before cancellation completes, while JWKS network
 * waits remain interruptible.
 *
 * **Example** (Verifying a signed ID token with explicit HS256 policy)
 *
 * ```ts import.meta.vitest
 * import { Oidc } from "@effect/auth"
 * import { Jwk, Jwt } from "@effect/auth/Jose"
 * import { NodeCrypto } from "@effect/platform-node"
 * import { DateTime, Effect, Redacted, Schema } from "effect"
 * import { Base64Url } from "effect/encoding"
 * import { FetchHttpClient } from "effect/http"
 *
 * const subject = await Effect.runPromise(Effect.gen(function*() {
 *   const secret = "example-secret-with-at-least-32-bytes"
 *   const now = yield* DateTime.now
 *   const seconds = Math.floor(DateTime.toEpochMillis(now) / 1000)
 *   const key = yield* Jwk.importSecret(Redacted.make({
 *     kty: "oct", k: Base64Url.encode(secret), alg: "HS256"
 *   }), "HS256")
 *   const token = yield* Jwt.sign(Schema.Record(Schema.String, Schema.Json), {
 *     iss: "https://issuer.example", sub: "subject-42", aud: "client",
 *     iat: seconds, exp: seconds + 300, nonce: "stored-nonce"
 *   }, key, { alg: "HS256" })
 *   const verifier = yield* Oidc.makeVerifier({
 *     metadata: {
 *       issuer: "https://issuer.example",
 *       authorization_endpoint: "https://issuer.example/authorize",
 *       token_endpoint: "https://issuer.example/token",
 *       response_types_supported: ["code"],
 *       code_challenge_methods_supported: ["S256"],
 *       id_token_signing_alg_values_supported: ["HS256"]
 *     },
 *     clientId: "client", algorithms: ["HS256"],
 *     clientSecret: Redacted.make(secret), timeout: "5 seconds"
 *   })
 *   const verified = yield* verifier.verify(token, {
 *     verificationStartedAt: now, nonce: Redacted.make("stored-nonce")
 *   })
 *   return verified.subject
 * }).pipe(
 *   Effect.scoped,
 *   Effect.provide(FetchHttpClient.layer),
 *   Effect.provide(NodeCrypto.layer)
 * ))
 * subject // => "subject-42"
 * ```
 *
 * @see {@link discover} for retrieving trusted issuer metadata
 * @see {@link Verifier}
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const makeVerifier = Effect.fnUntraced(function*(
  input: VerifierOptions
): Effect.fn.Return<
  Verifier,
  ConfigurationError | Unavailable,
  HttpClient.HttpClient | Scope.Scope
> {
  const options = yield* Validation.configuration(Configuration, input, "metadata")

  const metadata = Validation.freeze(options.metadata)

  const algorithms = idTokenAlgorithms.filter((algorithm) =>
    (options.algorithms ?? defaultIdTokenAlgorithms).includes(algorithm)
  )

  const advertised = algorithms.filter((algorithm) =>
    metadata.id_token_signing_alg_values_supported?.includes(algorithm)
  )

  const hmacOnly = advertised.length === 1 && advertised[0] === "HS256"

  if (
    advertised.length === 0 ||
    advertised.includes("HS256") !== hmacOnly ||
    !metadata.response_types_supported?.includes("code") ||
    ((options.pkceS256 ?? true) && !metadata.code_challenge_methods_supported?.includes("S256"))
  ) {
    return yield* ConfigurationError.make({ reason: "metadata" })
  }
  if (hmacOnly && options.clientSecret === undefined) {
    return yield* ConfigurationError.make({ reason: "authentication" })
  }

  const jwksUri = metadata.jwks_uri

  if (!hmacOnly && jwksUri === undefined) {
    return yield* ConfigurationError.make({ reason: "metadata" })
  }

  const hmacKey = hmacOnly && options.clientSecret !== undefined
    ? yield* Effect.acquireRelease(
      Jwk.importSecret(
        Redacted.make({
          kty: "oct" as const,
          alg: "HS256" as const,
          k: Base64Url.encode(new TextEncoder().encode(yield* Validation.reveal(options.clientSecret)))
        }),
        "HS256"
      ).pipe(Effect.mapError(() => ConfigurationError.make({ reason: "authentication" }))),
      (key) =>
        Effect.sync(() => {
          Redacted.value(key.material).fill(0)
          Redacted.wipeUnsafe(key.material)
          Redacted.wipeUnsafe(key.jwk)
        })
    )
    : undefined

  if (options.clientSecret !== undefined) Redacted.wipeUnsafe(options.clientSecret)

  const keys = hmacOnly || jwksUri === undefined
    ? undefined
    : Context.get(
      yield* Layer.build(
        Jwks.layerRemote({
          url: jwksUri,
          timeout: options.timeout,
          maxResponseBytes: options.maxResponseBytes
        }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, yield* Transport.capture)))
      ).pipe(Effect.mapError(() => Unavailable.make({}))),
      Jwks.Jwks
    )

  const { use } = yield* Ownership.make

  const verify = Effect.fnUntraced(function*(
    token: Redacted.Redacted<string>,
    input: VerificationInput
  ): Effect.fn.Return<Verified, Rejected | Unavailable, VerificationRequirements> {
    // Capture caller policy and secret values before key lookup or cryptography.
    const policy = yield* Validation.decode(VerifyInput, input)
    const start = DateTime.toEpochMillis(policy.verificationStartedAt)
    const expectedNonce = yield* Validation.reveal(policy.nonce)

    const accessToken = policy.accessToken === undefined ? undefined : yield* Validation.reveal(policy.accessToken)

    const code = policy.code === undefined ? undefined : yield* Validation.reveal(policy.code)

    // Jwt verifies the signature before any registered/application claim checks.
    // Unauthenticated malformed/key/signature failures must never burn a receipt.
    const tenantTemplate = isTenantIssuerTemplate(metadata.issuer)

    const jwtPolicy = {
      algorithms: advertised,
      ...(tenantTemplate ? {} : { issuer: metadata.issuer }),
      audience: options.clientId,
      requiredClaims: ["iss", "sub", "aud", "exp", "iat"] as const,
      clockTolerance: 0
    }

    const mapJwtError = (error: { readonly _tag: string }) =>
      error._tag === "JoseClaimValidationFailed" ? claimFailure() : Unavailable.make({})

    let verified: Jwt.Verified<JsonObject>
    let signingKey: Jwk.PublicKey | undefined

    if (hmacKey !== undefined) {
      verified = yield* Jwt.verify(JsonObject, token, hmacKey, jwtPolicy).pipe(
        Effect.mapError(mapJwtError)
      )
    } else {
      if (keys === undefined) return yield* Unavailable.make({})
      const opened = yield* Jwt.verifyWithKeySet(JsonObject, token, jwtPolicy).pipe(
        Effect.provideService(Jwks.Jwks, keys),
        Effect.mapError(mapJwtError)
      )
      verified = opened
      signingKey = opened.key
    }

    const claims = yield* Validation.decode(IdClaims, verified.claims).pipe(Effect.mapError(claimFailure))

    if (tenantTemplate) {
      const tenant = yield* Schema.decodeUnknownEffect(Schema.Struct({ tid: TenantId }))(
        verified.claims
      ).pipe(Effect.mapError(claimFailure))

      const expected = substituteTenantIssuer(metadata.issuer, tenant.tid)

      if (expected === undefined || claims.iss !== expected) return yield* claimFailure()
    }

    if (
      tenantTemplate ||
      metadata.signing_key_issuer_required === true ||
      signingKey?.jwk.issuer !== undefined
    ) {
      if (verified.protectedHeader.alg === "HS256" || signingKey === undefined) {
        return yield* claimFailure()
      }

      const keyIssuer = signingKey.jwk.issuer

      if (keyIssuer === undefined) return yield* claimFailure()

      const allowed = isTenantIssuerTemplate(keyIssuer)
        ? substituteTenantIssuer(
          keyIssuer,
          (yield* Schema.decodeUnknownEffect(Schema.Struct({ tid: TenantId }))(
            verified.claims
          ).pipe(Effect.mapError(claimFailure))).tid
        )
        : keyIssuer

      if (allowed !== claims.iss) return yield* claimFailure()
    }

    const now = (yield* Clock.currentTimeMillis) / 1000

    if (
      start < 0 ||
      start > now * 1000 ||
      (claims.azp !== undefined && claims.azp !== options.clientId) ||
      claims.exp <= now ||
      claims.iat > now ||
      (claims.nbf !== undefined && claims.nbf > now) ||
      (claims.auth_time !== undefined && claims.auth_time > now)
    ) {
      return yield* claimFailure()
    }
    if (policy.previous === undefined) {
      if (
        claims.nonce !== expectedNonce ||
        (policy.maxAge !== undefined &&
          (claims.auth_time === undefined ||
            claims.auth_time + policy.maxAge < Math.floor(now)))
      ) {
        return yield* claimFailure()
      }
    } else if (
      claims.sub !== policy.previous.subject ||
      (tenantTemplate
        ? claims.iss !== policy.previous.issuer
        : policy.previous.issuer !== undefined && claims.iss !== policy.previous.issuer) ||
      (claims.nonce !== undefined && claims.nonce !== expectedNonce) ||
      (claims.auth_time !== undefined && claims.auth_time !== policy.previous.authTime)
    ) {
      return yield* claimFailure()
    }
    const hashProfile = tokenHash(verified.protectedHeader.alg)

    if (hashProfile === undefined) return yield* claimFailure()

    for (
      const [hash, secret] of [
        [claims.at_hash, accessToken],
        [claims.c_hash, code]
      ] as const
    ) {
      if (hash === undefined) continue
      if (secret === undefined) return yield* claimFailure()
      const sha2 = yield* Sha2.Sha2

      // Native digests cannot be cancelled; join them before releasing the verifier operation.
      const digest = yield* sha2
        .digest(hashProfile.digest, new TextEncoder().encode(secret))
        .pipe(Effect.mapError(() => Unavailable.make({})), Effect.uninterruptible)

      if (digest.length !== hashProfile.octets * 2) return yield* Unavailable.make({})
      if (hash !== Base64Url.encode(digest.subarray(0, hashProfile.octets))) {
        return yield* claimFailure()
      }
    }
    // Re-read time after optional digest I/O so expired tokens cannot escape.
    const finished = (yield* Clock.currentTimeMillis) / 1000

    if (
      claims.exp <= finished ||
      (policy.previous === undefined &&
        policy.maxAge !== undefined &&
        claims.auth_time !== undefined &&
        claims.auth_time + policy.maxAge < Math.floor(finished))
    ) {
      return yield* claimFailure()
    }

    return {
      claims: Redacted.make(Validation.freeze(verified.claims)),
      subject: claims.sub,
      ...(claims.auth_time === undefined
        ? {}
        : {
          authTime: claims.auth_time,
          upstreamAuthenticatedAt: DateTime.makeUnsafe(Math.min(start, claims.auth_time * 1000))
        })
    }
  }, use)

  return { verify }
})
