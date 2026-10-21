import * as OAuth from "@effect/auth/OAuth"
import * as Operations from "@effect/auth/Operations"
import * as AuthSchema from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as Strava from "@effect/auth/Strava"
import { assert, it } from "@effect/vitest"
import { DateTime, Effect, Layer, Redacted, type Schema } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { webCryptoLayer } from "../../utils/crypto.ts"

const providerKey = OAuth.OAuthProviderKey.make("strava")
const callbackId = OAuth.OAuthCallbackId.make("strava")
const profile = Strava.accessProfile({ clientId: "123", scopes: ["read"] })

const setup = Effect.gen(function*() {
  const protocol = yield* Strava.provider({
    clientId: "123",
    clientSecret: Redacted.make("synthetic-provider-secret"),
    access: profile
  }).configure({
    provider: providerKey,
    callbacks: [
      { callbackId, redirectUri: OAuth.OAuthRedirectUri.make("https://app.example.com/callback") }
    ]
  })

  const connected = protocol.connected

  if (connected === undefined) return yield* Effect.die("Connected Strava capability missing")

  const prepared = yield* connected.prepareAuthorization({
    profile,
    callbackId,
    flowId: Operations.RequestBindingFlowId.make("strava-hardening")
  })

  return { protocol, connected, prepared }
})

const exchange = Effect.gen(function*() {
  const { protocol, prepared } = yield* setup

  return yield* protocol.exchangeVerifiedIdentity({
    configuration: prepared.configuration,
    secrets: prepared.secrets,
    response: {
      _tag: "Code",
      state: prepared.secrets.state,
      code: Redacted.make("synthetic-authorization-code"),
      scope: "read"
    },
    verificationStartedAt: yield* DateTime.now
  })
})

const token = {
  token_type: "Bearer",
  access_token: "synthetic-access-token",
  refresh_token: "synthetic-refresh-token",
  expires_at: 3600,
  scope: "read",
  athlete: {
    id: 1,
    firstname: "Ada",
    lastname: "Lovelace",
    profile: "https://images.example.com/ada"
  }
}

const chunked = (body: Schema.Json, onCancel: () => void) => {
  const bytes = new TextEncoder().encode(JSON.stringify(body))
  let offset = 0

  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) return controller.close()
        const end = Math.min(offset + 16384, bytes.length)

        controller.enqueue(bytes.slice(offset, end))
        offset = end
      },
      cancel: onCancel
    }),
    { headers: { "content-type": "application/json" } }
  )
}

const live = (response: () => Response) =>
  Layer.merge(
    webCryptoLayer,
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) => Effect.sync(() => HttpClientResponse.fromWeb(request, response())))
    )
  )

// Requested hardening: unknown JSON fields must not bypass a streaming response limit.
it.effect("cancels an oversized token response without retrying the exchange", () =>
  Effect.gen(function*() {
    let cancelled = false
    let requests = 0

    const result = yield* exchange.pipe(
      Effect.provide(
        live(() => {
          requests++

          return chunked({ ...token, ignored: "x".repeat(2 * 1048576) }, () => {
            cancelled = true
          })
        })
      ),
      Effect.result
    )

    assert.deepNestedInclude(result, { "_tag": "Failure", "failure._tag": "OAuthUnavailable" })
    assert.strictEqual(cancelled, true)
    assert.strictEqual(requests, 1)
  }))

it.effect("cancels an oversized athlete response during refresh", () =>
  Effect.gen(function*() {
    let cancelled = false
    let requests = 0

    const result = yield* Effect.gen(function*() {
      const { connected, prepared } = yield* setup
      const time = yield* DateTime.now

      return yield* connected.refreshGrant({
        context: OAuth.OAuthConnectedTokenContext.make({
          namespace: "effect-auth/oauth-connected-token-context/v1",
          moduleId: OAuth.OAuthModuleId.make("test/strava"),
          subjectId: AuthSchema.SubjectId.make("subject"),
          identity: {
            provider: providerKey,
            issuer: OAuth.OAuthIssuer.make("https://www.strava.com"),
            subject: "1"
          },
          configuration: prepared.configuration,
          grantId: OAuth.OAuthGrantId.make("test-grant"),
          grantVersion: Sessions.SecurityRevision.make("1"),
          tokenVersion: Sessions.SecurityRevision.make("1"),
          metadata: {
            scopes: ["read"],
            resources: [],
            useUntilMillis: 3600000,
            obtainedAtMillis: 0
          }
        }),
        material: OAuth.OAuthConnectedTokenMaterial.make({
          namespace: "effect-auth/oauth-connected-token-material/v1",
          accessToken: Redacted.make("synthetic-access-token"),
          refreshToken: Redacted.make("synthetic-refresh-token"),
          continuation: { _tag: "OAuth" }
        }),
        verificationStartedAt: time
      })
    }).pipe(
      Effect.provide(
        live(() => {
          requests++

          return requests === 1
            ? Response.json(token)
            : chunked({ ...token.athlete, ignored: "x".repeat(2 * 1048576) }, () => {
              cancelled = true
            })
        })
      ),
      Effect.result
    )

    assert.deepNestedInclude(result, { "_tag": "Failure", "failure._tag": "OAuthUnavailable" })
    assert.strictEqual(cancelled, true)
    assert.strictEqual(requests, 2)
  }))

it.effect.each([
  { name: "active-content avatar", athlete: { id: 1, profile: "javascript:alert(1)" } },
  {
    name: "oversized normalized name",
    athlete: { id: 1, firstname: "a".repeat(256), lastname: "b" }
  }
])("returns a typed failure for $name", ({ athlete }) =>
  Effect.gen(function*() {
    const result = yield* exchange.pipe(
      Effect.provide(live(() => Response.json({ ...token, athlete }))),
      Effect.result
    )

    assert.deepNestedInclude(result, { "_tag": "Failure", "failure._tag": "OAuthUnavailable" })
  }))

it.effect("preserves ordinary HTTPS profile metadata", () =>
  Effect.gen(function*() {
    const result = yield* exchange.pipe(Effect.provide(live(() => Response.json(token))))

    assert.strictEqual(result.profile?.avatarUrl, "https://images.example.com/ada")
    assert.strictEqual(result.identity.subject, "1")
  }))

it.effect("accepts an athlete without a profile photo", () =>
  Effect.gen(function*() {
    const result = yield* exchange.pipe(
      Effect.provide(
        live(() =>
          Response.json({
            ...token,
            athlete: { ...token.athlete, profile: "avatar/athlete/large.png" }
          })
        )
      )
    )

    assert.strictEqual(result.identity.subject, "1")
    assert.isUndefined(result.profile?.avatarUrl)
    assert.strictEqual(result.profile?.providerData?.profile, "avatar/athlete/large.png")
  }))
