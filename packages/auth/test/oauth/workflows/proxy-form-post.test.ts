import * as OAuth from "@effect/auth/OAuth"
import * as OAuthProxy from "@effect/auth/OAuthProxy"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import { Aead, Digest, SecureRandom } from "effect/crypto"

// Regression at f1da141a: an admitted form_post provider could not complete its
// proxy callback. Live providers cannot supply controlled first-consent data.
// Exercise the HTTP workflow with real envelope protection and a replacement
// persistence service: reject mixed/duplicate input before the valid callback,
// forward user once, then reject replay without exchanging credentials again.
it.effect("completes a form_post callback through the proxy without repeating exchange", () =>
  Effect.gen(function*() {
    const origin = "https://proxy.example"
    const callbackUrl = `${origin}/oauth-proxy/apple/callback`
    const state = "A".repeat(43)
    const user = JSON.stringify({ name: { firstName: "Ada", lastName: "Lovelace" } })
    let record: OAuthProxy.Record | undefined
    let exchanges = 0

    const crypto = Layer.mergeAll(
      Aead.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto)),
      Digest.layerWebCrypto
    )

    const persistence = Layer.succeed(OAuthProxy.Persistence, {
      get: () => Effect.succeed(record),
      insert: (_namespace, value) =>
        Effect.sync(() => {
          if (record !== undefined) return false
          record = value

          return true
        }),
      compareAndSet: (_namespace, version, value) =>
        Effect.sync(() => {
          if (record?.version !== version) return false
          record = value

          return true
        })
    })

    const live = OAuthProxy.layer({
      origin,
      providers: {
        apple: {
          configure: (binding) =>
            Effect.succeed({
              prepareAuthorization: () =>
                Schema.decodeEffect(OAuth.OAuthProtocolPreparation)({
                  configuration: {
                    provider: binding.provider,
                    protocol: "oidc",
                    configurationGeneration: 1,
                    issuer: "https://appleid.apple.com",
                    responseIssuerMode: "unsupported",
                    callbackId: OAuth.OAuthCallbackId.make("apple"),
                    redirectUri: OAuth.OAuthRedirectUri.make(callbackUrl)
                  },
                  responseMode: "form_post",
                  authorizationUrl: "https://appleid.apple.com/auth/authorize",
                  secrets: {
                    namespace: "effect-auth/oauth-transaction-secrets/v1",
                    state,
                    oidcNonce: "B".repeat(43)
                  }
                }).pipe(Effect.orDie),
              exchangeVerifiedIdentity: Effect.fnUntraced(function*(input) {
                exchanges++
                assert.strictEqual(input.response.user, user)

                return yield* Schema.decodeEffect(OAuth.OAuthVerifiedExternalIdentity)({
                  identity: {
                    provider: binding.provider,
                    issuer: "https://appleid.apple.com",
                    subject: "apple-subject"
                  }
                }).pipe(Effect.orDie)
              })
            })
        }
      },
      environments: [
        {
          id: "app",
          secret: Redacted.make("C".repeat(43)),
          callbacks: [
            {
              provider: OAuth.OAuthProviderKey.make("apple"),
              callbackId: OAuth.OAuthCallbackId.make("app"),
              redirectUri: "https://app.example/auth/apple/callback"
            }
          ]
        }
      ]
    }).pipe(
      Layer.provide(persistence),
      Layer.provide(
        OAuthProxy.protectorLayer({
          activeKeyId: "key",
          keys: [
            { id: "key", material: Redacted.make("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc") }
          ]
        }).pipe(Layer.provide(crypto))
      ),
      Layer.provide(crypto)
    )

    yield* Effect.gen(function*() {
      const server = yield* OAuthProxy.Server

      const prepared = yield* server.handle(
        new Request(`${origin}/oauth-proxy/prepare`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${"C".repeat(43)}`
          },
          body: JSON.stringify({
            environment: "app",
            provider: "apple",
            callbackId: "app",
            redirectUri: "https://app.example/auth/apple/callback",
            flowId: "flow",
            verifierDigest: "D".repeat(43)
          })
        })
      )

      assert.strictEqual(prepared.status, 200)

      const callback = (url: string, body: string) =>
        server.handle(
          new Request(url, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body
          })
        )

      const form = new URLSearchParams({ state, code: "provider-code", user }).toString()

      assert.strictEqual((yield* callback(`${callbackUrl}?state=${state}`, form)).status, 400)
      assert.strictEqual((yield* callback(callbackUrl, `${form}&state=${state}`)).status, 400)
      const completed = yield* callback(callbackUrl, form)

      assert.strictEqual(completed.status, 303)
      assert.ok(
        completed.headers.get("location")?.startsWith(
          "https://app.example/auth/apple/callback?"
        )
      )
      assert.strictEqual((yield* callback(callbackUrl, form)).status, 400)
      assert.strictEqual(exchanges, 1)
    }).pipe(Effect.provide(live))
  }))
