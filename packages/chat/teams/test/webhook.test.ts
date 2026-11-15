/**
 * The messaging endpoint through `layerWebhook`, with tokens signed by a
 * key in a stubbed Bot Framework key set.
 */
import * as TeamsChat from "@effect/chat-teams/TeamsChat"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { ChatHandler } from "effect/chat/ChatHandler"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as HttpRouter from "effect/http/HttpRouter"
import { Jwk, Jwt } from "effect/jose"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

const appId = "00000000-0000-0000-0000-0000000000a1"
const tenantId = "00000000-0000-0000-0000-0000000000b2"
const serviceUrl = "https://smba.trafficmanager.net/emea/"
const keysUrl = "https://login.botframework.com/v1/.well-known/keys"

const crypto = Layer.mergeAll(Digest.layerWebCrypto, Mac.layerWebCrypto, Signature.layerWebCrypto).pipe(
  Layer.provideMerge(SecureRandom.layerWebCrypto)
)

const Claims = Schema.Struct({
  iss: Schema.String,
  aud: Schema.String,
  exp: Schema.Number,
  serviceurl: Schema.String
})

const activity = (overrides?: Record<string, unknown>) => ({
  type: "message",
  id: "1800000000001",
  timestamp: "2026-11-15T10:00:00.000Z",
  serviceUrl,
  channelId: "msteams",
  from: { id: "29:user", aadObjectId: "user", name: "User" },
  recipient: { id: `28:${appId}`, name: "Bot" },
  conversation: { id: "a:direct", conversationType: "personal", tenantId },
  channelData: { tenant: { id: tenantId } },
  text: "hello",
  ...overrides
})

const setup = Effect.fnUntraced(function*(options?: { readonly jwksUri?: string }) {
  const pair = yield* Jwk.generateKeyPair({ algorithm: "RS256", kid: "k1" })
  const key = yield* Jwk.importPrivate(pair.privateKey, "RS256")
  const token = (claimed = serviceUrl) =>
    Effect.map(
      Jwt.sign(
        Claims,
        {
          iss: "https://api.botframework.com",
          aud: appId,
          exp: Math.floor(Date.now() / 1000) + 600,
          serviceurl: claimed
        },
        key,
        { kid: "k1" }
      ),
      Redacted.value
    )
  const fetched: Array<{ readonly url: string; readonly redirect: RequestRedirect | undefined }> = []
  const http = HttpClient.make((request, url, _signal, fiber) =>
    Effect.sync(() => {
      fetched.push({
        url: url.href,
        redirect: Context.getOrUndefined(fiber.context, FetchHttpClient.RequestInit)?.redirect
      })
      const body = url.href === keysUrl
        ? { keys: [{ ...pair.publicKey, endorsements: ["msteams"] }] }
        : url.pathname.endsWith("/openidconfiguration")
        ? { jwks_uri: options?.jwksUri ?? keysUrl }
        : {}
      return HttpClientResponse.fromWeb(request, Response.json(body))
    })
  )
  const events: Array<ChatEvent.ChatEvent> = []
  const app = TeamsChat.layerWebhook({ path: "/api/messages" }).pipe(
    Layer.provide(TeamsChat.layer({ appId, tenantId, credentials: Redacted.make("secret") })),
    Layer.provide(Chat.layer),
    Layer.provide(Layer.succeed(ChatHandler, { handle: (event) => Effect.sync(() => void events.push(event)) })),
    Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
    Layer.provide(crypto)
  )
  const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
  yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))
  const send = (body: unknown, authorization?: string) =>
    Effect.promise(() =>
      handler(
        new Request("http://localhost/api/messages", {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "content-type": "application/json",
            ...(authorization === undefined ? {} : { authorization })
          }
        })
      )
    ).pipe(Effect.map((response) => response.status))
  return { events, fetched, send, token }
})

describe("layerWebhook", () => {
  it.effect("answers 403 without a valid token, and for a token bound to another serviceUrl", () =>
    Effect.gen(function*() {
      const { events, send, token } = yield* setup()
      assert.strictEqual(yield* send(activity()), 403)
      assert.strictEqual(yield* send(activity(), "Bearer not.a.token"), 403)
      const other = yield* token("https://smba.trafficmanager.net/amer/")
      assert.strictEqual(yield* send(activity(), `Bearer ${other}`), 403)
      const wrongTenant = activity({ conversation: { id: "a:direct", conversationType: "personal", tenantId: "x" } })
      assert.strictEqual(yield* send(wrongTenant, `Bearer ${yield* token()}`), 403)
      assert.strictEqual(events.length, 0)
    }).pipe(Effect.provide(crypto)))

  it.effect("hands a verified message to the ChatHandler, and drops a targeted one", () =>
    Effect.gen(function*() {
      const { events, send, token } = yield* setup()
      const bearer = `Bearer ${yield* token()}`
      assert.strictEqual(yield* send(activity(), bearer), 200)
      assert.strictEqual(
        yield* send(activity({ id: "1800000000002", recipient: { id: `28:${appId}`, isTargeted: true } }), bearer),
        200
      )
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0]._tag, "MessageCreated")
    }).pipe(Effect.provide(crypto)))

  it.effect("fetches the metadata and the key set with redirects off", () =>
    Effect.gen(function*() {
      const { fetched, send, token } = yield* setup()
      assert.strictEqual(yield* send(activity(), `Bearer ${yield* token()}`), 200)
      const discovery = fetched.filter((request) => request.url.startsWith("https://login.botframework.com/"))
      assert.deepStrictEqual(discovery.map((request) => request.url), [
        "https://login.botframework.com/v1/.well-known/openidconfiguration",
        keysUrl
      ])
      assert.isTrue(discovery.every((request) => request.redirect === "manual"))
    }).pipe(Effect.provide(crypto)))

  it.effect("answers 503 for metadata whose jwks_uri is not a URL", () =>
    Effect.gen(function*() {
      const { events, send, token } = yield* setup({ jwksUri: "not a URL" })
      assert.strictEqual(yield* send(activity(), `Bearer ${yield* token()}`), 503)
      assert.strictEqual(events.length, 0)
    }).pipe(Effect.provide(crypto)))
})
