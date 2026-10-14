import { type Errors, OAuth, Oidc, Pkce } from "@effect/oauth"
import type * as Crypto from "effect/Crypto"
import type * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import type * as Redacted from "effect/Redacted"
import type * as Scope from "effect/Scope"
import { describe, expect, it } from "tstyche"

declare const clientOptions: OAuth.ClientOptions
declare const verifierOptions: Oidc.VerifierOptions
declare const verifier: Oidc.Verifier
declare const verification: Oidc.VerificationInput
declare const receipt: OAuth.TokenReceipt
declare const client: OAuth.Client
declare const secret: Redacted.Redacted<string>
declare const codeGrant: OAuth.CodeGrantInput
declare const refreshGrant: OAuth.RefreshGrantInput
declare const revocation: OAuth.RevocationInput
declare const authorization: OAuth.AuthorizationInput

describe("OAuth protocol type contracts", () => {
  it("requires HTTP and an owning scope only when installing clients", () => {
    const installed = OAuth.make(clientOptions)
    expect<Effect.Services<typeof installed>>().type.toBe<HttpClient.HttpClient | Scope.Scope>()
    expect<Effect.Success<typeof installed>>().type.toBe<OAuth.Client>()
    expect<Effect.Error<typeof installed>>().type.toBe<Errors.ConfigurationError | Errors.Unavailable>()

    const code = client.codeGrant(codeGrant)
    const refreshed = client.refreshGrant(refreshGrant)
    const revoked = client.revoke(revocation)
    const url = client.authorizationUrl(authorization)
    const profile = client.fetchProfile(secret)
    expect<Effect.Services<typeof code>>().type.toBe<never>()
    expect<Effect.Services<typeof refreshed>>().type.toBe<never>()
    expect<Effect.Services<typeof revoked>>().type.toBe<never>()
    expect<Effect.Success<typeof code>>().type.toBe<OAuth.TokenReceipt>()
    expect<Effect.Success<typeof refreshed>>().type.toBe<OAuth.TokenReceipt>()
    expect<Effect.Success<typeof revoked>>().type.toBe<void>()
    expect<Effect.Success<typeof url>>().type.toBe<Redacted.Redacted<string>>()
    expect<Effect.Success<typeof profile>>().type.toBe<OAuth.JsonObject>()
  })

  it("keeps raw receipts private and separates normalization from exchange", () => {
    const tokens = OAuth.tokens(receipt)
    expect<Effect.Services<typeof tokens>>().type.toBe<never>()
    expect<Effect.Success<typeof tokens>>().type.toBe<OAuth.TokenSet>()
    expect<Effect.Error<typeof tokens>>().type.toBe<Errors.Rejected | Errors.Unavailable>()
    expect<OAuth.TokenReceipt["body"]>().type.toBe<Redacted.Redacted<OAuth.JsonObject>>()
    expect<OAuth.TokenSet["accessToken"]>().type.toBe<Redacted.Redacted<string>>()
    expect<OAuth.TokenSet["refreshToken"]>().type.toBe<Redacted.Redacted<string> | undefined>()
    expect<OAuth.TokenSet["idToken"]>().type.toBe<Redacted.Redacted<string> | undefined>()
    expect<OAuth.TokenSet["expiresIn"]>().type.toBe<number | undefined>()
    expect<OAuth.TokenSet["tokenType"]>().type.toBe<"bearer">()
  })

  it("requires only HTTP for discovery and preserves issuer helper types", () => {
    const discovered = Oidc.discover("https://issuer.example", { timeoutMs: 1000 })
    expect<Effect.Services<typeof discovered>>().type.toBe<HttpClient.HttpClient>()
    expect<Effect.Success<typeof discovered>>().type.toBe<OAuth.Metadata>()
    expect<Effect.Error<typeof discovered>>().type.toBe<Errors.ConfigurationError | Errors.Unavailable>()
    expect<ReturnType<typeof Oidc.isTenantIssuerTemplate>>().type.toBe<boolean>()
    expect<ReturnType<typeof Oidc.discoveredIssuerMatches>>().type.toBe<boolean>()
    expect<ReturnType<typeof Oidc.substituteTenantIssuer>>().type.toBe<string | undefined>()
  })

  it("keeps scoped verification and native hash requirements distinct", () => {
    const installed = Oidc.makeVerifier(verifierOptions)
    const verified = verifier.verify(secret, verification)
    expect<Effect.Services<typeof installed>>().type.toBe<HttpClient.HttpClient | Scope.Scope>()
    expect<Effect.Success<typeof installed>>().type.toBe<Oidc.Verifier>()
    expect<Effect.Error<typeof installed>>().type.toBe<Errors.ConfigurationError | Errors.Unavailable>()
    expect<Effect.Services<typeof verified>>().type.toBe<Crypto.Crypto>()
    expect<Effect.Success<typeof verified>>().type.toBe<Oidc.Verified>()
    expect<Effect.Error<typeof verified>>().type.toBe<Errors.Rejected | Errors.Unavailable>()
    expect<Oidc.Verified["claims"]>().type.toBe<Redacted.Redacted<OAuth.JsonObject>>()
    expect<Oidc.IdTokenAlgorithm>().type.toBe<"RS256" | "PS256" | "ES256" | "EdDSA" | "HS256">()
    expect<OAuth.Metadata["signing_key_issuer_required"]>().type.toBe<true | undefined>()
  })

  it("requires Effect Crypto for private transaction secrets and S256", () => {
    const random = Pkce.random()
    const challenge = Pkce.challenge(secret)
    const transaction = Pkce.make()
    expect<Effect.Services<typeof random>>().type.toBe<Crypto.Crypto>()
    expect<Effect.Services<typeof challenge>>().type.toBe<Crypto.Crypto>()
    expect<Effect.Services<typeof transaction>>().type.toBe<Crypto.Crypto>()
    expect<Effect.Success<typeof random>>().type.toBe<Redacted.Redacted<string>>()
    expect<Effect.Success<typeof challenge>>().type.toBe<string>()
    expect<Effect.Error<typeof transaction>>().type.toBe<Errors.Unavailable>()
  })

  it("preserves safe tagged error and authentication discriminants", () => {
    expect<Errors.ConfigurationError["_tag"]>().type.toBe<"OAuthConfigurationError">()
    expect<Errors.Rejected["reason"]>().type.toBe<"invalid_grant" | "claims">()
    expect<Errors.Rejected["_tag"]>().type.toBe<"OAuthRejected">()
    expect<Errors.Unavailable["_tag"]>().type.toBe<"OAuthUnavailable">()
    expect<Extract<OAuth.Authentication, { method: "none" }>>().type.toBe<{
      readonly method: "none"
      readonly publicClient: true
    }>()
    expect<Extract<OAuth.Authentication, { method: "client_secret_basic" }>["secret"]>()
      .type.toBe<Redacted.Redacted<string>>()
    expect<Extract<OAuth.Authentication, { method: "client_secret_post" }>["secret"]>()
      .type.toBe<Redacted.Redacted<string> | undefined>()
  })
})
