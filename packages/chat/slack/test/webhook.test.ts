import { handleRequest, makeVerifier, type Options } from "@effect/chat-slack/internal/webhook"
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import * as Chat from "effect/chat/Chat"
import { ChatError, PlatformUnavailable } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { ChatHandler, NotAccepted } from "effect/chat/ChatHandler"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { TestClock } from "effect/testing"
import { appId, authTest, botUserId, makeFake, messageEnvelope, team } from "./utils.ts"

const secret = "8f742231b10e8888abcd99yyyzzz85a5"

const sign = async (timestamp: string, body: string, key = secret) => {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(`v0:${timestamp}:${body}`)))
  return "v0=" + Array.from(mac, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const unavailable = new ChatError({
  platform: "slack",
  op: "auth.test",
  reason: new PlatformUnavailable({ retry: "retry", detail: "http_503" })
})

const now = () => String(Math.floor(Date.now() / 1000))

const request = async (body: string, options?: { readonly timestamp?: string; readonly key?: string }) => {
  const timestamp = options?.timestamp ?? now()
  return new Request("http://localhost/slack/events", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": await sign(timestamp, body, options?.key)
    }
  })
}

const message = messageEnvelope({ ts: "1794509003.000001", user: "U080YLYB277", text: "hi <@U0CCLMD4S1L>" })

const handle = Effect.fnUntraced(function*(options: Partial<Options>, web: Request) {
  const verify = yield* makeVerifier(Redacted.make(secret))
  const events: Array<ChatEvent.ChatEvent> = []
  const response = yield* handleRequest(HttpServerRequest.fromWeb(web), {
    verify,
    appId,
    teamId: team,
    botUserId: Effect.succeed(botUserId),
    handle: (event) => Effect.sync(() => void events.push(event)),
    deadline: Duration.seconds(2),
    maxBodyBytes: 1024 * 1024,
    ...options
  })
  return { status: response.status, response, events }
})

describe("webhook", () => {
  it.live("a signed event reaches the handler", () =>
    Effect.gen(function*() {
      const result = yield* handle({}, yield* Effect.promise(() => request(JSON.stringify(message))))
      assert.strictEqual(result.status, 200)
      assert.strictEqual(result.events.length, 1)
      assert.strictEqual(result.events[0]._tag, "MessageCreated")
    }))

  it.live("rejects a bad or stale signature", () =>
    Effect.gen(function*() {
      const body = JSON.stringify(message)
      const wrongKey = yield* handle({}, yield* Effect.promise(() => request(body, { key: "other" })))
      assert.strictEqual(wrongKey.status, 401)
      const stale = String(Math.floor(Date.now() / 1000) - 6 * 60)
      const old = yield* handle({}, yield* Effect.promise(() => request(body, { timestamp: stale })))
      assert.strictEqual(old.status, 401)
      const unsigned = yield* handle({}, new Request("http://localhost/", { method: "POST", body }))
      assert.strictEqual(unsigned.status, 401)
      assert.strictEqual(wrongKey.events.length + old.events.length + unsigned.events.length, 0)
    }))

  it.live("413 past the body limit, 400 for a body that is not JSON", () =>
    Effect.gen(function*() {
      const big = yield* handle({ maxBodyBytes: 100 }, yield* Effect.promise(() => request("x".repeat(101))))
      assert.strictEqual(big.status, 413)
      const notJson = yield* handle({}, yield* Effect.promise(() => request("not json")))
      assert.strictEqual(notJson.status, 400)
    }))

  it.live("answers url_verification with its challenge", () =>
    Effect.gen(function*() {
      const body = JSON.stringify({
        token: "t",
        challenge: "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
        type: "url_verification"
      })
      const result = yield* handle({}, yield* Effect.promise(() => request(body)))
      assert.strictEqual(result.status, 200)
      const web = HttpServerResponse.toWeb(result.response)
      assert.strictEqual(
        yield* Effect.promise(() => web.text()),
        "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"
      )
    }))

  it.live("drops another app's event with 200", () =>
    Effect.gen(function*() {
      const result = yield* handle(
        {},
        yield* Effect.promise(() => request(JSON.stringify({ ...message, api_app_id: "A0OTHER" })))
      )
      assert.strictEqual(result.status, 200)
      assert.strictEqual(result.events.length, 0)
    }))

  it.live("503 so Slack retries: no bot user, NotAccepted, past the deadline", () =>
    Effect.gen(function*() {
      const body = JSON.stringify(message)
      const noBot = yield* handle(
        { botUserId: Effect.fail(unavailable) },
        yield* Effect.promise(() => request(body))
      )
      assert.strictEqual(noBot.status, 503)
      assert.strictEqual(noBot.events.length, 0)
      const refused = yield* handle(
        { handle: () => Effect.fail(new NotAccepted()) },
        yield* Effect.promise(() => request(body))
      )
      assert.strictEqual(refused.status, 503)
      const slow = yield* handle(
        { handle: () => Effect.never, deadline: Duration.millis(20) },
        yield* Effect.promise(() => request(body))
      )
      assert.strictEqual(slow.status, 503)
      // The deadline covers the bot user lookup too.
      const slowBot = yield* handle(
        { botUserId: Effect.never, deadline: Duration.millis(20) },
        yield* Effect.promise(() => request(body))
      )
      assert.strictEqual(slowBot.status, 503)
      assert.strictEqual(slowBot.events.length, 0)
    }))

  it.effect("layerWebhook bounds a request whose body never finishes", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      const events: Array<ChatEvent.ChatEvent> = []
      const app = SlackChat.layerWebhook({
        path: "/slack/events",
        signingSecret: Redacted.make(secret),
        appId,
        deadline: Duration.seconds(2)
      }).pipe(
        Layer.provide(SlackChat.layer({ botToken: Redacted.make("xoxb-test"), teamId: team })),
        Layer.provide(Chat.layer),
        Layer.provide(Layer.succeed(ChatHandler, { handle: (event) => Effect.sync(() => void events.push(event)) })),
        Layer.provide(fake.layer)
      )
      const router = yield* HttpRouter.toHttpEffect(app)
      let cancelled = false
      const web = new Request("http://localhost/slack/events", {
        method: "POST",
        body: new ReadableStream({
          cancel: () => {
            cancelled = true
          }
        }),
        duplex: "half",
        headers: { "x-slack-request-timestamp": now(), "x-slack-signature": "v0=" + "0".repeat(64) }
      } as RequestInit)
      const fiber = yield* router.pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromWeb(web)),
        Effect.forkChild
      )
      yield* TestClock.adjust(2000)
      const response = yield* Fiber.join(fiber)
      assert.strictEqual(response.status, 503)
      assert.strictEqual(events.length, 0)
      assert.isTrue(cancelled)
    }))

  it.live("layerWebhook serves the path", () =>
    Effect.gen(function*() {
      const fake = makeFake({ "auth.test": authTest })
      const events: Array<ChatEvent.ChatEvent> = []
      const app = SlackChat.layerWebhook({ path: "/slack/events", signingSecret: Redacted.make(secret), appId }).pipe(
        Layer.provide(SlackChat.layer({ botToken: Redacted.make("xoxb-test"), teamId: team })),
        Layer.provide(Chat.layer),
        Layer.provide(Layer.succeed(ChatHandler, { handle: (event) => Effect.sync(() => void events.push(event)) })),
        Layer.provide(fake.layer)
      )
      const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
      const response = yield* Effect.promise(() => request(JSON.stringify(message)).then((web) => handler(web)))
      yield* Effect.promise(() => dispose())
      assert.strictEqual(response.status, 200)
      assert.strictEqual(events.length, 1)
      assert.strictEqual(fake.called("auth.test").length, 1)
    }))
})
