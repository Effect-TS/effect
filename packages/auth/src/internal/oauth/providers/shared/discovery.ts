import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { Metadata } from "../../../../oauth/OAuth.ts"
import { OpenIdConnectConfigurationError } from "./models.ts"

/**
 * Private, first-party discovery supplements; generic OIDC remains strict.
 *
 * @internal
 */
export const discoveryProfile = Symbol("effect-auth/OpenIdConnect/discoveryProfile")

/** @internal */
export const DiscoveryProfile = Schema.Literals([
  "slack",
  "roblox",
  "line",
  "railway",
  "cognito",
  "microsoft",
  "apple"
])

const pinned = {
  slack: {
    issuer: "https://slack.com",
    authorization_endpoint: "https://slack.com/openid/connect/authorize",
    token_endpoint: "https://slack.com/api/openid.connect.token",
    jwks_uri: "https://slack.com/openid/connect/keys"
  },
  roblox: {
    issuer: "https://apis.roblox.com/oauth/",
    authorization_endpoint: "https://apis.roblox.com/oauth/v1/authorize",
    token_endpoint: "https://apis.roblox.com/oauth/v1/token",
    jwks_uri: "https://apis.roblox.com/oauth/v1/certs"
  },
  line: {
    issuer: "https://access.line.me",
    authorization_endpoint: "https://access.line.me/oauth2/v2.1/authorize",
    token_endpoint: "https://api.line.me/oauth2/v2.1/token",
    jwks_uri: "https://api.line.me/oauth2/v2.1/certs"
  },
  railway: {
    issuer: "https://backboard.railway.com",
    authorization_endpoint: "https://backboard.railway.com/oauth/auth",
    token_endpoint: "https://backboard.railway.com/oauth/token",
    jwks_uri: "https://backboard.railway.com/oauth/jwks"
  },
  apple: {
    issuer: "https://appleid.apple.com",
    authorization_endpoint: "https://appleid.apple.com/auth/authorize",
    token_endpoint: "https://appleid.apple.com/auth/token",
    jwks_uri: "https://appleid.apple.com/auth/keys"
  }
} as const

const cognitoIssuer =
  /^https:\/\/cognito-idp\.[a-z]{2}(?:-[a-z0-9]+)+\.amazonaws\.com\/[a-z]{2}(?:-[a-z0-9]+)+_[A-Za-z0-9]+$/

/** @internal */
export const discoveryMetadataUrl = (
  profile: typeof DiscoveryProfile.Type | undefined
): string | undefined =>
  profile === "railway"
    ? "https://backboard.railway.com/oauth/.well-known/openid-configuration"
    : undefined

/** @internal */
export const supplementDiscovery = Effect.fnUntraced(function*(
  metadata: Metadata,
  profile: typeof DiscoveryProfile.Type | undefined
) {
  if (profile === undefined) return metadata
  if (profile === "cognito") {
    if (
      !cognitoIssuer.test(metadata.issuer) ||
      metadata.jwks_uri !== `${metadata.issuer}/.well-known/jwks.json`
    ) {
      return yield* OpenIdConnectConfigurationError.make({ reason: "metadata" })
    }
  } else if (profile === "microsoft") {
    if (metadata.jwks_uri === undefined) {
      return yield* OpenIdConnectConfigurationError.make({ reason: "metadata" })
    }

    let sameOrigin = false

    try {
      const issuer = new URL(metadata.issuer)
      const authorization = new URL(metadata.authorization_endpoint)
      const token = new URL(metadata.token_endpoint)
      const jwks = new URL(metadata.jwks_uri)

      sameOrigin = issuer.origin === authorization.origin &&
        issuer.origin === token.origin &&
        issuer.origin === jwks.origin &&
        authorization.pathname.endsWith("/oauth2/v2.0/authorize") &&
        token.pathname.endsWith("/oauth2/v2.0/token") &&
        jwks.pathname.endsWith("/discovery/v2.0/keys")
    } catch {
      sameOrigin = false
    }

    if (!sameOrigin) return yield* OpenIdConnectConfigurationError.make({ reason: "metadata" })
  } else {
    const expected = pinned[profile]

    if (
      metadata.issuer !== expected.issuer ||
      metadata.authorization_endpoint !== expected.authorization_endpoint ||
      metadata.token_endpoint !== expected.token_endpoint ||
      metadata.jwks_uri !== expected.jwks_uri
    ) {
      return yield* OpenIdConnectConfigurationError.make({ reason: "metadata" })
    }

    // Apple does not advertise S256. Do not invent a PKCE method for it.
    if (profile === "apple") return metadata
  }

  // Slack documents code_verifier at docs.slack.dev/reference/methods/openid.connect.token/
  // but omits PKCE from discovery. Roblox documents S256 at
  // create.roblox.com/docs/cloud/auth/oauth2-develop and also omits it.
  // LINE documents HS256 for web login at developers.line.biz/en/docs/line-login/verify-id-token/
  // and omits it from discovery. Cognito documents PKCE at
  // docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html
  // and also omits it. Entra ID completes S256 PKCE but omits it from discovery.
  // Supply only the missing advertisement; an explicit
  // incompatible capability still fails the shared validation.
  const algorithms = metadata.id_token_signing_alg_values_supported ?? []

  return {
    ...metadata,
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"],
    ...(profile === "line" && !algorithms.includes("HS256")
      ? { id_token_signing_alg_values_supported: [...algorithms, "HS256"] }
      : {})
  }
})
