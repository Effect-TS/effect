import type { OAuth, OAuthError, OAuthProvider, Oidc } from "@effect/auth/oauth"
import { type Apple, GitHub, Google, Microsoft, type Notion, type Strava } from "@effect/auth/oauth/providers"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import type * as Scope from "effect/Scope"
import { describe, expect, it } from "tstyche"

declare const githubOptions: GitHub.Options
declare const googleOptions: Google.Options
declare const microsoftOptions: Microsoft.Options
declare const github: GitHub.Client["Service"]
declare const google: Google.Client["Service"]
declare const microsoft: Microsoft.Client["Service"]
declare const apple: Apple.Client["Service"]
declare const notion: Notion.Client["Service"]
declare const strava: Strava.Client["Service"]
declare const githubAuthorization: GitHub.AuthorizationInput
declare const googleAuthorization: Google.AuthorizationInput
declare const authorization: OAuthProvider.AuthorizationInput
declare const oidcAuthorization: OAuthProvider.OidcAuthorizationInput
declare const exchange: OAuthProvider.ExchangeInput
declare const oidcExchange: OAuthProvider.OidcExchangeInput
declare const secret: Redacted.Redacted<string>

describe("OAuth provider type contracts", () => {
  it("requires PKCE and OIDC nonces and restricts provider prompts", () => {
    expect(github.authorizationUrl).type.toBeCallableWith(githubAuthorization)
    expect(github.exchangeCode).type.toBeCallableWith(exchange)
    expect(github.authorizationUrl).type.not.toBeCallableWith({ state: secret })
    expect(github.authorizationUrl).type.not.toBeCallableWith({ ...githubAuthorization, prompt: "login" })
    expect(github.exchangeCode).type.not.toBeCallableWith({ code: secret })
    expect(google.authorizationUrl).type.toBeCallableWith(googleAuthorization)
    expect(google.authorizationUrl).type.not.toBeCallableWith({ ...googleAuthorization, prompt: "login" })
    expect(google.exchangeCode).type.toBeCallableWith(oidcExchange)
    expect(google.authorizationUrl).type.not.toBeCallableWith(authorization)
    expect(google.exchangeCode).type.not.toBeCallableWith(exchange)
    expect(microsoft.authorizationUrl).type.toBeCallableWith(oidcAuthorization)
    expect(microsoft.exchangeCode).type.toBeCallableWith(oidcExchange)
    expect(microsoft.authorizationUrl).type.not.toBeCallableWith(authorization)
    expect(microsoft.exchangeCode).type.not.toBeCallableWith(exchange)
  })

  it("preserves each private profile while exposing the original OAuth client", () => {
    const githubResult = github.exchangeCode(exchange)
    const googleResult = google.exchangeCode(oidcExchange)
    const microsoftResult = microsoft.exchangeCode(oidcExchange)
    expect<Effect.Success<typeof githubResult>>().type.toBe<OAuthProvider.ExchangeResult<GitHub.Profile>>()
    expect<Effect.Success<typeof googleResult>>().type.toBe<OAuthProvider.ExchangeResult<Google.Profile>>()
    expect<Effect.Success<typeof microsoftResult>>().type.toBe<OAuthProvider.ExchangeResult<Microsoft.Profile>>()
    expect<Effect.Success<typeof githubResult>["identity"]["profile"]>().type.toBe<Redacted.Redacted<GitHub.Profile>>()
    expect<Effect.Success<typeof googleResult>["identity"]["profile"]>().type.toBe<Redacted.Redacted<Google.Profile>>()
    expect<Effect.Success<typeof microsoftResult>["identity"]["profile"]>().type.toBe<
      Redacted.Redacted<Microsoft.Profile>
    >()
    expect(github.oauth).type.toBe<OAuth.Client>()
    expect<Google.Profile["hd"]>().type.toBe<string | undefined>()
    expect<Microsoft.Profile["oid"]>().type.toBe<string>()
    expect<Microsoft.Profile["tid"]>().type.toBe<string>()
  })

  it("omits PKCE for Apple, Notion, and Strava while retaining Apple's nonce", () => {
    expect(apple.authorizationUrl).type.toBeCallableWith({ state: secret, nonce: secret })
    expect(apple.authorizationUrl).type.not.toBeCallableWith({ state: secret })
    expect(apple.exchangeCode).type.toBeCallableWith({ code: secret, nonce: secret })
    expect(apple.exchangeCode).type.not.toBeCallableWith({ code: secret })
    expect(notion.authorizationUrl).type.toBeCallableWith({ state: secret })
    expect(notion.exchangeCode).type.toBeCallableWith({ code: secret })
    expect(strava.authorizationUrl).type.toBeCallableWith({ state: secret })
    expect(strava.exchangeCode).type.toBeCallableWith({ code: secret })
  })

  it("accepts private Apple callback data and Strava callback scope text", () => {
    expect(apple.exchangeCode).type.toBeCallableWith({ code: secret, nonce: secret, user: secret })
    expect(apple.exchangeCode).type.not.toBeCallableWith({ code: secret, nonce: secret, user: "callback JSON" })
    expect(strava.exchangeCode).type.toBeCallableWith({ code: secret, scope: "read,activity:read" })
    expect(strava.exchangeCode).type.not.toBeCallableWith({ code: secret, scope: ["read", "activity:read"] })
    expect<Apple.Profile["email_verified"]>().type.toBe<boolean | undefined>()
    expect<Apple.Profile["is_private_email"]>().type.toBe<boolean | undefined>()
  })

  it("captures HTTP and Scope at installation and retains OIDC verification requirements", () => {
    expect<Effect.Services<ReturnType<typeof GitHub.make>>>().type.toBe<HttpClient.HttpClient | Scope.Scope>()
    expect<Effect.Services<ReturnType<typeof Google.make>>>().type.toBe<HttpClient.HttpClient | Scope.Scope>()
    expect<Effect.Services<ReturnType<typeof Microsoft.make>>>().type.toBe<HttpClient.HttpClient | Scope.Scope>()
    const githubResult = github.exchangeCode(exchange)
    const googleResult = google.exchangeCode(oidcExchange)
    const microsoftResult = microsoft.exchangeCode(oidcExchange)
    expect<Effect.Services<typeof githubResult>>().type.toBe<never>()
    expect<Effect.Services<typeof googleResult>>().type.toBe<Oidc.VerificationRequirements>()
    expect<Effect.Services<typeof microsoftResult>>().type.toBe<Oidc.VerificationRequirements>()
    expect<Effect.Error<typeof githubResult>>().type.toBe<
      OAuthError.ConfigurationError | OAuthError.Rejected | OAuthError.Unavailable
    >()
    expect<Effect.Error<typeof googleResult>>().type.toBe<
      OAuthError.ConfigurationError | OAuthError.Rejected | OAuthError.Unavailable
    >()
  })

  it("provides all provider services without leaving an owning Scope in consumer requirements", () => {
    const program = Effect.gen(function*() {
      return {
        github: yield* GitHub.Client,
        google: yield* Google.Client,
        microsoft: yield* Microsoft.Client
      }
    }).pipe(Effect.provide(Layer.mergeAll(
      GitHub.layer(githubOptions),
      Google.layer(googleOptions),
      Microsoft.layer(microsoftOptions)
    )))
    expect<Effect.Services<typeof program>>().type.toBe<HttpClient.HttpClient>()
    expect<Effect.Success<typeof program>>().type.toBe<{
      github: GitHub.Client["Service"]
      google: Google.Client["Service"]
      microsoft: Microsoft.Client["Service"]
    }>()
  })
})
