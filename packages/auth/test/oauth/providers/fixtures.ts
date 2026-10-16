import type { OAuth, OAuthProvider } from "@effect/auth/oauth"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as jose from "jose"
import { createHash } from "node:crypto"
import { metadata } from "../fixtures.ts"

export { cryptoLayer, form, receipt, transport } from "../fixtures.ts"

export const providerOptions = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret-with-at-least-32-bytes"),
  redirectUri: "https://app.example/callback",
  timeout: "5 seconds"
} satisfies OAuthProvider.Options

export const authorization = {
  state: Redacted.make("private-state"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
} satisfies OAuthProvider.AuthorizationInput

export const oidcAuthorization = {
  ...authorization,
  nonce: Redacted.make("private-nonce")
} satisfies OAuthProvider.OidcAuthorizationInput

export const exchange: OAuthProvider.ExchangeInput = {
  code: Redacted.make("single-use-code"),
  pkceVerifier: Redacted.make("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
}

export const oidcExchange: OAuthProvider.OidcExchangeInput = {
  ...exchange,
  nonce: oidcAuthorization.nonce
}

export const seconds = 2_000_000_000

const tokenHash = (value: string) => createHash("sha256").update(value).digest().subarray(0, 16).toString("base64url")

export const claims: jose.JWTPayload = {
  sub: "pairwise-subject",
  aud: providerOptions.clientId,
  iat: seconds,
  exp: seconds + 300,
  auth_time: seconds - 10,
  nonce: "private-nonce",
  at_hash: tokenHash("private-access"),
  c_hash: tokenHash("single-use-code")
}

export const generateSigningKeys = (algorithm: "RS256" | "PS256" | "ES256" | "EdDSA" = "RS256") =>
  Effect.promise(async () => {
    const keys = await jose.generateKeyPair(algorithm, { extractable: true })
    return { privateKey: keys.privateKey, jwk: { ...await jose.exportJWK(keys.publicKey), kid: "provider-key" } }
  })

export const signingKeys = generateSigningKeys()

export const sign = (key: CryptoKey | Uint8Array, payload: jose.JWTPayload, algorithm = "RS256") =>
  Effect.promise(() => new jose.SignJWT(payload).setProtectedHeader({ alg: algorithm, kid: "provider-key" }).sign(key))

export const metadataFor = (issuer: string): OAuth.Metadata => {
  const base = issuer.replace(/\/$/u, "")
  return {
    issuer,
    authorization_endpoint: base + "/authorize",
    token_endpoint: base + "/token",
    jwks_uri: base + "/jwks",
    userinfo_endpoint: base + "/userinfo",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    id_token_signing_alg_values_supported: ["RS256"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    authorization_response_iss_parameter_supported: true
  }
}

export const googleMetadata: OAuth.Metadata = {
  ...metadata,
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  revocation_endpoint: "https://oauth2.googleapis.com/revoke"
}

export const microsoftOrigin = "https://login.microsoftonline.com"
export const microsoftTemplate = microsoftOrigin + "/{tenantid}/v2.0"

export const microsoftMetadata = (authority = "common"): OAuth.Metadata => ({
  issuer: microsoftTemplate,
  authorization_endpoint: microsoftOrigin + "/" + authority + "/oauth2/v2.0/authorize",
  token_endpoint: microsoftOrigin + "/" + authority + "/oauth2/v2.0/token",
  jwks_uri: microsoftOrigin + "/common/discovery/v2.0/keys",
  response_types_supported: ["code"],
  id_token_signing_alg_values_supported: ["RS256"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"]
})
