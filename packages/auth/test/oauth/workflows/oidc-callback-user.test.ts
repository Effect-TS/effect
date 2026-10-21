import { AppleUserProfile } from "@effect/auth/Apple"
import { Jwk, Jwt } from "@effect/auth/jose"
import { OAuthProtocol, type OAuthProtocolPreparation, OAuthProviderKey } from "@effect/auth/OAuth"
import * as OpenIdConnect from "@effect/auth/OpenIdConnect"
import { RequestBindingFlowId } from "@effect/auth/Operations"
import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, Redacted, Schema } from "effect"
import { FetchHttpClient } from "effect/http"
import { TestClock } from "effect/testing"
import { webCryptoLayer as layerWebCrypto } from "../../utils/crypto.ts"
import { mockFetch } from "../../utils/fetch.ts"

import { discoveryProfile } from "@effect/auth/internal/oauth/providers/shared/discovery"

const seconds = 1_700_000_000

const json = (body: unknown) => Response.json(body)

const platform = Layer.mergeAll(
  FetchHttpClient.layer,
  layerWebCrypto
)

const IdToken = Schema.Struct({
  iss: Schema.String,
  sub: Schema.String,
  aud: Schema.String,
  iat: Schema.Number,
  exp: Schema.Number,
  nonce: Schema.String,
  email: Schema.String
})

const metadata = (issuer: string, authorization: string, token: string, jwks: string) => ({
  issuer,
  authorization_endpoint: authorization,
  token_endpoint: token,
  jwks_uri: jwks,
  response_types_supported: ["code"],
  id_token_signing_alg_values_supported: ["ES256"],
  token_endpoint_auth_methods_supported: ["client_secret_basic"],
  code_challenge_methods_supported: ["S256"],
  authorization_response_iss_parameter_supported: issuer !== "https://appleid.apple.com"
})

const user = JSON.stringify({ name: { firstName: "Arbitrary", lastName: "Name" } })

const exchange = (protocol: OAuthProtocol["Service"], started: OAuthProtocolPreparation) =>
  protocol.exchangeVerifiedIdentity({
    configuration: started.configuration,
    secrets: started.secrets,
    verificationStartedAt: DateTime.makeUnsafe(seconds * 1000),
    response: {
      _tag: "Code",
      state: started.secrets.state,
      code: Redacted.make("single-use-code"),
      user,
      ...(started.configuration.responseIssuerMode === "required"
        ? { issuer: started.configuration.issuer }
        : {})
    }
  })

describe("OIDC callback user field", () => {
  // Apple sends the name once, unsigned, in the callback `user` field. The
  // shared exchange merged that field for every OIDC provider, so a non-Apple
  // ID token that omitted name could be given an arbitrary display name.
  it.effect("merges the unsigned callback user field only for Apple", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "key" })
      const signing = yield* Jwk.importPrivate(pair.privateKey, "ES256")
      let idToken = ""

      const fetch: typeof globalThis.fetch = mockFetch(async (input) => {
        const url = input instanceof Request ? input.url : String(input)
        const issuer = url.replace(/\/\.well-known\/openid-configuration$/u, "")

        if (issuer === "https://idp.example.test") {
          return json(
            metadata(
              issuer,
              "https://idp.example.test/authorize",
              "https://idp.example.test/token",
              "https://idp.example.test/jwks"
            )
          )
        }
        if (issuer === "https://appleid.apple.com") {
          return json(
            metadata(
              issuer,
              "https://appleid.apple.com/auth/authorize",
              "https://appleid.apple.com/auth/token",
              "https://appleid.apple.com/auth/keys"
            )
          )
        }
        if (url.endsWith("/token")) {
          return json({
            access_token: "private-access",
            token_type: "Bearer",
            id_token: idToken
          })
        }
        if (
          url === "https://idp.example.test/jwks" ||
          url === "https://appleid.apple.com/auth/keys"
        ) {
          return json({ keys: [pair.publicKey] })
        }
        throw new Error(`Unexpected endpoint ${url}`)
      })

      const protocol = yield* Layer.build(
        OpenIdConnect.layer({
          providers: [
            {
              protocol: "oidc",
              provider: "workspace",
              issuer: "https://idp.example.test",
              clientId: "client",
              clientSecret: Redacted.make("client-secret"),
              redirectUri: "https://app.test/callback",
              idTokenSignedResponseAlg: "ES256",
              scopes: ["openid", "email"]
            },
            {
              protocol: "oidc",
              provider: "apple",
              issuer: "https://appleid.apple.com",
              clientId: "com.example.app",
              clientSecret: Redacted.make("client-secret"),
              redirectUri: "https://app.test/apple/callback",
              idTokenSignedResponseAlg: "ES256",
              pkceS256: false,
              responseIssuerMode: "unsupported",
              scopes: ["openid", "name"],
              [discoveryProfile]: "apple"
            }
          ]
        })
      ).pipe(
        Effect.map(Context.get(OAuthProtocol)),
        Effect.provide(platform),
        Effect.provideService(FetchHttpClient.Fetch, fetch)
      )

      const sign = (issuer: string, audience: string, nonce: string) =>
        Jwt.sign(
          IdToken,
          {
            iss: issuer,
            sub: "provider-subject",
            aud: audience,
            iat: seconds,
            exp: seconds + 300,
            nonce,
            email: "ada@example.com"
          },
          signing,
          { alg: "ES256", kid: "key" }
        ).pipe(Effect.map(Redacted.value))

      const workspace = yield* protocol.prepareAuthorization({
        provider: OAuthProviderKey.make("workspace"),
        flowId: RequestBindingFlowId.make("flow-workspace")
      })

      const workspaceNonce = workspace.secrets.oidcNonce

      if (workspaceNonce === undefined) return yield* Effect.die("expected an OIDC nonce")
      idToken = yield* sign("https://idp.example.test", "client", Redacted.value(workspaceNonce))
      const workspaceIdentity = yield* exchange(protocol, workspace)

      assert.strictEqual(workspaceIdentity.profile?.email, "ada@example.com")
      assert.isUndefined(workspaceIdentity.profile?.displayName)

      const apple = yield* protocol.prepareAuthorization({
        provider: OAuthProviderKey.make("apple"),
        flowId: RequestBindingFlowId.make("flow-apple")
      })

      const appleNonce = apple.secrets.oidcNonce

      if (appleNonce === undefined) return yield* Effect.die("expected an OIDC nonce")
      idToken = yield* sign(
        "https://appleid.apple.com",
        "com.example.app",
        Redacted.value(appleNonce)
      )
      const appleIdentity = yield* exchange(protocol, apple)

      assert.strictEqual(appleIdentity.profile?.displayName, "Arbitrary Name")
    }).pipe(Effect.provide(platform)))
})

describe("Apple string verification flags", () => {
  // AppleUserProfile accepts email_verified as "true" or "false", but the
  // sign-in exchange also projects those raw claims through the boolean-only
  // standard profile. That second decode rejects the callback before a session.
  it.effect("completes Apple sign-in when email_verified is the string true or false", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "key" })
      const signing = yield* Jwk.importPrivate(pair.privateKey, "ES256")
      let idToken = ""

      const fetch: typeof globalThis.fetch = mockFetch(async (input) => {
        const url = input instanceof Request ? input.url : String(input)

        if (url === "https://appleid.apple.com/.well-known/openid-configuration") {
          return json(
            metadata(
              "https://appleid.apple.com",
              "https://appleid.apple.com/auth/authorize",
              "https://appleid.apple.com/auth/token",
              "https://appleid.apple.com/auth/keys"
            )
          )
        }
        if (url.endsWith("/auth/token")) {
          return json({
            access_token: "private-access",
            token_type: "Bearer",
            id_token: idToken
          })
        }
        if (url === "https://appleid.apple.com/auth/keys") return json({ keys: [pair.publicKey] })
        throw new Error(`Unexpected endpoint ${url}`)
      })

      const protocol = yield* Layer.build(
        OpenIdConnect.layer({
          providers: [
            {
              protocol: "oidc",
              provider: "apple",
              issuer: "https://appleid.apple.com",
              clientId: "com.example.app",
              clientSecret: Redacted.make("client-secret"),
              redirectUri: "https://app.test/apple/callback",
              idTokenSignedResponseAlg: "ES256",
              pkceS256: false,
              responseIssuerMode: "unsupported",
              profileSchema: AppleUserProfile,
              scopes: ["openid", "email"],
              [discoveryProfile]: "apple"
            }
          ]
        })
      ).pipe(
        Effect.map(Context.get(OAuthProtocol)),
        Effect.provide(platform),
        Effect.provideService(FetchHttpClient.Fetch, fetch)
      )

      const started = yield* protocol.prepareAuthorization({
        provider: OAuthProviderKey.make("apple"),
        flowId: RequestBindingFlowId.make("flow-apple-flags")
      })

      const nonce = started.secrets.oidcNonce

      if (nonce === undefined) return yield* Effect.die("expected an OIDC nonce")

      const sign = (emailVerified: "true" | "false") =>
        Jwt.sign(
          Schema.Struct({
            ...IdToken.fields,
            email_verified: Schema.Literals(["true", "false"])
          }),
          {
            iss: "https://appleid.apple.com",
            sub: "provider-subject",
            aud: "com.example.app",
            iat: seconds,
            exp: seconds + 300,
            nonce: Redacted.value(nonce),
            email: "ada@example.com",
            email_verified: emailVerified
          },
          signing,
          { alg: "ES256", kid: "key" }
        ).pipe(Effect.map(Redacted.value))

      idToken = yield* sign("true")
      const verified = yield* exchange(protocol, started)

      assert.strictEqual(verified.identity.subject, "provider-subject")
      assert.strictEqual(verified.profile?.email, "ada@example.com")
      assert.strictEqual(verified.profile?.emailVerified, true)
      assert.deepNestedInclude(verified.profile?.providerData, { "email_verified": true })

      idToken = yield* sign("false")
      const unverified = yield* exchange(protocol, started)

      assert.strictEqual(unverified.identity.subject, "provider-subject")
      assert.strictEqual(unverified.profile?.emailVerified, false)
      assert.deepNestedInclude(unverified.profile?.providerData, { "email_verified": false })
    }).pipe(Effect.provide(platform)))
})
