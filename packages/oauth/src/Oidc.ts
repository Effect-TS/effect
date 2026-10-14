/**
 * Trusted-issuer discovery and tenant helpers for OAuth provider metadata.
 *
 * This module does not verify signed OpenID Connect ID tokens, fetch signing keys,
 * validate token claims, or authenticate identities. Discovery and issuer matching
 * are configuration helpers only; opaque ID-token receipts remain unverified.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Schema from "effect/Schema"

import { ConfigurationError, Unavailable } from "./Errors.ts"
import * as Transport from "./internal/transport.ts"
import * as V from "./internal/validation.ts"
import { Metadata, type RequestOptions } from "./OAuth.ts"

/**
 * Trusted-issuer discovery request bounds and an optional explicit metadata document URL.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface DiscoverOptions extends RequestOptions {
  /** Fetch this document instead of issuer + `/.well-known/openid-configuration`.
   * The document issuer must still equal the trusted issuer identifier. */
  readonly metadataUrl?: string
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
 * import { Oidc } from "@effect/oauth"
 *
 * Oidc.isTenantIssuerTemplate("https://login.example/{tenantid}/v2.0") // => true
 * Oidc.isTenantIssuerTemplate("https://login.example/tenantid/v2.0") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.1.0
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
 * import { Oidc } from "@effect/oauth"
 *
 * const issuer = Oidc.substituteTenantIssuer(
 *   "https://login.example/{tenantid}/v2.0",
 *   "11111111-1111-1111-1111-111111111111"
 * )
 * issuer // => "https://login.example/11111111-1111-1111-1111-111111111111/v2.0"
 * Oidc.substituteTenantIssuer("https://login.example/{tenantid}/v2.0", "common") // => undefined
 * ```
 *
 * @stability unstable
 * @category mapping
 * @since 4.1.0
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
 * import { Oidc } from "@effect/oauth"
 *
 * Oidc.discoveredIssuerMatches("https://issuer.example", "https://issuer.example") // => true
 * Oidc.discoveredIssuerMatches("https://issuer.example/", "https://issuer.example") // => false
 * Oidc.discoveredIssuerMatches("https://issuer.example", "https://other.example") // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.1.0
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
  ...V.RequestOptions.fields,
  metadataUrl: Schema.optionalKey(V.Endpoint)
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
 * import { Oidc } from "@effect/oauth"
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
 *   Oidc.discover("https://issuer.example", { timeoutMs: 5000 }).pipe(
 *     Effect.provideService(HttpClient.HttpClient, http)
 *   )
 * )
 * metadata.issuer // => "https://issuer.example"
 * ```
 *
 * @stability unstable
 * @category discovery
 * @since 4.1.0
 */
export const discover = Effect.fnUntraced(function*(
  input: string,
  inputOptions: DiscoverOptions
): Effect.fn.Return<Metadata, ConfigurationError | Unavailable, HttpClient.HttpClient> {
  const issuer = yield* V.configuration(V.Issuer, input, "issuer")

  const options = yield* V.configuration(DiscoverConfiguration, inputOptions)
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
  const metadata = yield* V.configuration(Metadata, yield* V.reveal(document.body), "metadata")

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
    : yield* V.configuration(
      Metadata,
      { ...metadata, issuer: pinned },
      "metadata"
    )

  return V.freeze(accepted)
})
