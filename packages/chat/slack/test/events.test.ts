/**
 * Events API deliveries captured from Slack (see fixtures/events). Each body
 * is the string Slack sent, so these run the webhook on real bytes.
 */
import { handleRequest, makeVerifier } from "@effect/chat-slack/internal/webhook"
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { dedupeKey } from "effect/chat/ChatEvent"
import { checkEvent } from "effect/chat/ChatTest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as fs from "node:fs"
import { appId, botUserId, channel, checkOptions, team } from "./utils.ts"

interface Delivery {
  readonly headers: Record<string, string>
  readonly body: string
}

const captured = (name: string): ReadonlyArray<Delivery> =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/events/${name}.json`, import.meta.url), "utf8")).deliveries

const cases = fs.readdirSync(new URL("./fixtures/events/", import.meta.url))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.slice(0, -5))

const context = { teamId: team, botUserId }

// Signed here, with a test secret: the capture never logs Slack's signature.
const secret = "captured-delivery-test-secret"

const sign = async (timestamp: string, body: string) => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign"
  ])
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`v0:${timestamp}:${body}`)))
  return "v0=" + Array.from(mac, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** One delivery through the webhook, with its captured content type. */
const deliver = Effect.fnUntraced(function*(delivery: Delivery) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = yield* Effect.promise(() => sign(timestamp, delivery.body))
  const web = new Request("http://localhost/slack/events", {
    method: "POST",
    body: delivery.body,
    headers: {
      "content-type": delivery.headers["content-type"],
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature
    }
  })
  const events: Array<ChatEvent.ChatEvent> = []
  const response = yield* handleRequest(HttpServerRequest.fromWeb(web), {
    verify: yield* makeVerifier(Redacted.make(secret)),
    appId,
    teamId: team,
    botUserId: Effect.succeed(botUserId),
    handle: (event) => Effect.sync(() => void events.push(event)),
    deadline: Duration.seconds(2),
    maxBodyBytes: 1024 * 1024
  })
  assert.strictEqual(response.status, 200)
  return events
})

/** The events of every delivery of a case, in delivery order. */
const deliveries = (name: string) => Effect.forEach(captured(name), deliver)

const created = (events: ReadonlyArray<ChatEvent.ChatEvent>): ChatEvent.MessageCreated => {
  assert.strictEqual(events.length, 1)
  const event = events[0]
  assert(event._tag === "MessageCreated")
  return event
}

const mentions = (event: ChatEvent.MessageCreated) =>
  event.message.mentions.map(({ end, id, isSelf, start }) => ({
    id,
    isSelf,
    text: event.message.text.slice(start, end)
  }))

const partsOf = (thread: ChatEvent.MessageCreated["thread"]) => Option.getOrThrow(SlackChat.parts(thread))

const selfMention = (label = "") => [{ id: botUserId, isSelf: true, text: `<@${botUserId}${label}>` }]

describe("captured Events API deliveries", () => {
  it.live("every delivery passes the webhook and normalises as SlackChat.normalize does", () =>
    Effect.gen(function*() {
      for (const name of cases) {
        for (const delivery of captured(name)) {
          assert.strictEqual(delivery.headers["content-type"], "application/json")
          assert.isUndefined(delivery.headers["x-slack-signature"])
          const events = yield* deliver(delivery)
          assert.deepStrictEqual(events, SlackChat.normalize(JSON.parse(delivery.body), context), name)
          for (const event of events) yield* checkEvent(event, checkOptions)
        }
      }
    }))

  it.live("a root mention, then the root's message_changed deliveries give nothing", () =>
    Effect.gen(function*() {
      const [root, ...changed] = yield* deliveries("thread-root")
      const event = created(root)
      assert.deepStrictEqual(mentions(event), selfMention())
      assert.isTrue(event.message.author.isSelf)
      assert.deepStrictEqual(partsOf(event.thread), { team, channel })
      assert.strictEqual(changed.length, 2)
      for (const events of changed) assert.deepStrictEqual(events, [])
    }))

  it.live("a thread reply and a thread_broadcast belong to the root's thread", () =>
    Effect.gen(function*() {
      const root = created((yield* deliveries("thread-root"))[0]).message.id
      const reply = created((yield* deliveries("thread-reply"))[0])
      assert.deepStrictEqual(partsOf(reply.thread), { team, channel, threadTs: root })
      assert.deepStrictEqual(mentions(reply), selfMention())
      // Slack sent a message_changed for the broadcast before the broadcast itself.
      const [changed, broadcast] = yield* deliveries("thread-broadcast")
      assert.deepStrictEqual(changed, [])
      const event = created(broadcast)
      assert.deepStrictEqual(partsOf(event.thread), { team, channel, threadTs: root })
      assert.deepStrictEqual(mentions(event), selfMention())
    }))

  it.live("an edit gives nothing, whether it keeps, adds or removes the mention", () =>
    Effect.gen(function*() {
      const expected: Record<string, ReturnType<typeof selfMention>> = {
        "edit-keeps-mention": selfMention(),
        "edit-adds-mention": [],
        "edit-removes-mention": selfMention()
      }
      for (const [name, before] of Object.entries(expected)) {
        const [original, edit] = yield* deliveries(name)
        assert.deepStrictEqual(mentions(created(original)), before, name)
        assert.deepStrictEqual(edit, [], name)
      }
    }))

  it.live("a mention only in code, a Block Kit section or an attachment is not reported", () =>
    Effect.gen(function*() {
      for (const name of ["code-only-mention", "block-kit-mention", "attachment-mention"]) {
        const event = created((yield* deliveries(name))[0])
        assert.deepStrictEqual(event.message.mentions, [], name)
      }
    }))

  it.live("a /me line keeps its labelled mention token", () =>
    Effect.gen(function*() {
      const event = created((yield* deliveries("me-message"))[0])
      assert.deepStrictEqual(mentions(event), selfMention("|janitor2"))
    }))

  it.live("a file share with a mention in its comment", () =>
    Effect.gen(function*() {
      const event = created((yield* deliveries("file-mention"))[0])
      assert.deepStrictEqual(mentions(event), selfMention())
      assert.deepStrictEqual(
        event.message.attachments.map(({ contentType, name, size }) => ({ contentType, name, size })),
        [{ name: "fixture.txt", contentType: "text/plain", size: 13 }]
      )
    }))

  it.live("reactions by name, with Slack's primary names and a skin tone", () =>
    Effect.gen(function*() {
      const [message, ...reactions] = yield* deliveries("reactions")
      const id = created(message).message.id
      assert.deepStrictEqual(
        reactions.map((events) => {
          assert.strictEqual(events.length, 1)
          const event = events[0]
          assert(event._tag === "ReactionAdded" || event._tag === "ReactionRemoved")
          assert.strictEqual(event.messageId, id)
          return [event._tag, event.emoji]
        }),
        [["ReactionAdded", "👍"], ["ReactionAdded", "👍🏽"], ["ReactionAdded", "😀"], ["ReactionRemoved", "😀"]]
      )
      // An add and its removal are different events.
      assert.notStrictEqual(dedupeKey(reactions[2][0]), dedupeKey(reactions[3][0]))
    }))

  it.live("a native stream arrives as an empty message from the bot, its text only as message_changed", () =>
    Effect.gen(function*() {
      const [start, changed] = yield* deliveries("native-stream")
      const event = created(start)
      assert.strictEqual(event.message.text, "")
      assert.isTrue(event.message.author.isSelf)
      assert.deepStrictEqual(changed, [])
    }))

  it.live("Slack sent no app_mention for the bot's own messages", () =>
    Effect.sync(() => {
      for (const name of cases) {
        for (const delivery of captured(name)) {
          assert.notStrictEqual(JSON.parse(delivery.body).event.type, "app_mention")
        }
      }
    }))
})
