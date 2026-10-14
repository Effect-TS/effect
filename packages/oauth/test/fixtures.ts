import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Redacted from "effect/Redacted"

import type { OAuth } from "@effect/oauth"

export const cryptoLayer = NodeCrypto.layer

export const metadata: OAuth.Metadata = {
  issuer: "https://issuer.example/tenant/",
  authorization_endpoint: "https://issuer.example/authorize",
  token_endpoint: "https://issuer.example/token",
  jwks_uri: "https://issuer.example/jwks",
  revocation_endpoint: "https://issuer.example/revoke",
  code_challenge_methods_supported: ["S256"],
  response_types_supported: ["code"],
  id_token_signing_alg_values_supported: ["RS256"],
  revocation_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"]
}

export const options: OAuth.ClientOptions = {
  metadata,
  clientId: "client",
  authentication: { method: "client_secret_post", secret: Redacted.make("client-secret") },
  timeoutMs: 1000,
  profile: { url: "https://api.example/user", headers: { "X-Api-Version": "2026" } }
}

export const codeInput = {
  code: Redacted.make("single-use-code"),
  redirectUri: "https://app.example/callback",
  pkceVerifier: Redacted.make("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
} satisfies OAuth.CodeGrantInput

export const tokenBody = {
  access_token: "private-access",
  token_type: "Bearer",
  refresh_token: "private-refresh",
  scope: "read:user, repo",
  expires_in: 60,
  refresh_token_expires_in: 600
}

export const transport = (respond: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  HttpClient.make((request) => Effect.sync(() => HttpClientResponse.fromWeb(request, respond(request))))

export const form = (request: HttpClientRequest.HttpClientRequest) => {
  assert.strictEqual(request.body._tag, "Uint8Array")
  if (request.body._tag !== "Uint8Array") throw new Error("Expected encoded form body")

  return new URLSearchParams(new TextDecoder().decode(request.body.body))
}

export const receipt = (body: OAuth.JsonObject, status = 200): OAuth.TokenReceipt => ({
  status,
  contentType: "application/json",
  body: Redacted.make(body)
})

export const mockFetch = (
  fetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>
): typeof globalThis.fetch => Object.assign(fetch, { preconnect: () => {} })
