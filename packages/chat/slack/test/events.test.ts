/**
 * Events API deliveries captured from Slack (see fixtures/events). Each body
 * is the string Slack sent, so these run the webhook on real bytes.
 */
import { handleRequest, makeVerifier } from "@effect/chat-slack/internal/webhook"
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { dedupeKey } from "effect/chat/ChatEvent"
import { checkEvent, sameMessage } from "effect/chat/ChatTest"
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
          assert.isUndefined(delivery.headers["x-slack-retry-num"])
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

  it.live("Slack sent app_mention only for messages from a person", () =>
    Effect.sync(() => {
      for (const name of cases) {
        for (const delivery of captured(name)) {
          const event = JSON.parse(delivery.body).event
          if (event.type === "app_mention") assert.strictEqual(event.user, person, name)
        }
      }
    }))
})

const person = "U080YLYB277"

type Body = { readonly event: Record<string, unknown> }

/** The `message` and `app_mention` deliveries of one message, matched by ts. */
const pairsOf = (name: string) => {
  const bodies = captured(name).map((delivery): Body => JSON.parse(delivery.body))
  return bodies.flatMap((mention) => {
    if (mention.event.type !== "app_mention" || mention.event.edited !== undefined) return []
    const message = bodies.filter((body) =>
      body.event.type === "message" && body.event.ts === mention.event.ts && body.event.hidden === undefined
    )
    assert.strictEqual(message.length, 1, name)
    return [[message[0], mention] as const]
  })
}

describe("captured deliveries for messages a person typed", () => {
  it.live("each message and app_mention pair normalises to the same event", () =>
    Effect.gen(function*() {
      const found: Array<string> = []
      for (const name of cases) {
        for (const [message, mention] of pairsOf(name)) {
          const fromMessage = created(SlackChat.normalize(message, context))
          const fromMention = created(SlackChat.normalize(mention, context))
          yield* checkEvent(fromMessage, checkOptions)
          yield* checkEvent(fromMention, checkOptions)
          assert.strictEqual(dedupeKey(fromMessage), dedupeKey(fromMention), name)
          assert.isTrue(sameMessage(fromMessage.message, fromMention.message), name)
          const { raw: _a, ...left } = fromMessage.message
          const { raw: _b, ...right } = fromMention.message
          assert.deepStrictEqual(left, right, name)
          assert.deepStrictEqual(fromMessage.thread, fromMention.thread, name)
          assert.isFalse(fromMessage.message.author.isSelf)
          assert.deepStrictEqual(
            mentions(fromMessage),
            selfMention(String(message.event.subtype) === "me_message" ? "|janitor2" : "")
          )
          found.push(name)
        }
      }
      assert.deepStrictEqual(found.sort(), [
        "human-edit-keeps-mention",
        "human-edit-removes-mention",
        "human-file-mention",
        "human-me-message",
        "human-mention",
        "human-thread-broadcast"
      ])
    }))

  it.live("a plain message has no mention, and its later message_changed gives nothing", () =>
    Effect.gen(function*() {
      const [message, changed] = yield* deliveries("human-plain")
      const event = created(message)
      assert.strictEqual(event.message.author.id, person)
      assert.isFalse(event.message.author.isSelf)
      assert.isFalse(event.message.author.isBot)
      assert.deepStrictEqual(event.message.mentions, [])
      assert.deepStrictEqual(changed, [])
    }))

  it.live("a thread root's message_changed after its first reply gives nothing", () =>
    Effect.gen(function*() {
      const [message, mention, changed] = yield* deliveries("human-mention")
      assert.strictEqual(created(message).message.id, created(mention).message.id)
      assert.deepStrictEqual(changed, [])
    }))

  it.live("an edit gives nothing, including the app_mention Slack sends when it adds a mention", () =>
    Effect.gen(function*() {
      const [original, changed, mention] = yield* deliveries("human-edit-adds-mention")
      assert.deepStrictEqual(created(original).message.mentions, [])
      assert.deepStrictEqual(changed, [])
      assert.deepStrictEqual(mention, [])
      const [, , rootChanged, removed] = yield* deliveries("human-edit-removes-mention")
      assert.deepStrictEqual(rootChanged, [])
      assert.deepStrictEqual(removed, [])
      const [, , kept, keptRoot] = yield* deliveries("human-edit-keeps-mention")
      assert.deepStrictEqual(kept, [])
      assert.deepStrictEqual(keptRoot, [])
    }))

  it.live("a literal @name in code is no mention", () =>
    Effect.gen(function*() {
      const [events] = yield* deliveries("human-code-mention")
      assert.deepStrictEqual(created(events).message.mentions, [])
    }))

  it.live("a file share keeps its file, and its later message_changed gives nothing", () =>
    Effect.gen(function*() {
      const [message, , changed] = yield* deliveries("human-file-mention")
      assert.deepStrictEqual(created(message).message.attachments.map(({ name }) => name), ["T3.svg"])
      assert.deepStrictEqual(changed, [])
    }))

  it.live("a thread_broadcast belongs to the thread it was sent in", () =>
    Effect.gen(function*() {
      const root = created((yield* deliveries("human-plain"))[0]).message.id
      const [message, changed] = yield* deliveries("human-thread-broadcast")
      assert.deepStrictEqual(partsOf(created(message).thread), { team, channel, threadTs: root })
      assert.deepStrictEqual(changed, [])
    }))

  it.live("reactions, with a skin tone and a custom emoji", () =>
    Effect.gen(function*() {
      const root = created((yield* deliveries("human-plain"))[0]).message.id
      const reactions = (yield* deliveries("human-reactions")).map((events) => {
        assert.strictEqual(events.length, 1)
        const event = events[0]
        assert(event._tag === "ReactionAdded" || event._tag === "ReactionRemoved")
        assert.strictEqual(event.messageId, root)
        assert.strictEqual(event.userId, person)
        return event
      })
      assert.deepStrictEqual(reactions.map((event) => [event._tag, event.emoji]), [
        ["ReactionAdded", "👍"],
        ["ReactionRemoved", "👍"],
        ["ReactionAdded", "👍🏼"],
        ["ReactionRemoved", "👍🏼"],
        ["ReactionAdded", "custom:effect"],
        ["ReactionRemoved", "custom:effect"]
      ])
      assert.strictEqual(new Set(reactions.map(dedupeKey)).size, 6)
    }))
})

describe("captured deliveries for the bot's replies and stops", () => {
  it.live("janitor's status message, its edits and its deletion: only the posts are events", () =>
    Effect.gen(function*() {
      const results = yield* deliveries("bot-reply-lifecycle")
      const posted = results.filter((events) => events.length > 0).map(created)
      assert.strictEqual(posted.length, 2)
      const root = created((yield* deliveries("human-mention"))[0]).message.id
      for (const event of posted) {
        assert.isTrue(event.message.author.isSelf)
        assert.deepStrictEqual(partsOf(event.thread), { team, channel, threadTs: root })
      }
    }))

  it.live("only the first click on Stop names the open stream", () =>
    Effect.gen(function*() {
      const results = yield* deliveries("stop-stream")
      const root = created(results[0]).message.id
      const stream = created(results[2])
      assert.strictEqual(stream.message.text, "")
      const stops = results.flat().filter((event) => event._tag === "StopRequested")
      assert.deepStrictEqual(stops.map((event) => event.messageIds), [[stream.message.id], [], []])
      for (const stop of stops) {
        assert.strictEqual(stop.userId, person)
        assert.deepStrictEqual(Option.getOrThrow(SlackChat.parts(stop.thread)), { team, channel, threadTs: root })
      }
      // Each click is its own request.
      assert.strictEqual(new Set(stops.map(dedupeKey)).size, 3)
    }))

  it.live("a click on Stop with no stream open sends an empty streaming_message_ts", () =>
    Effect.gen(function*() {
      const bodies = captured("stop-no-stream").map((delivery) => JSON.parse(delivery.body).event)
      const stops = bodies.filter((event) => event.type === "agent_session_stopped")
      assert.deepStrictEqual(stops.map((event) => event.streaming_message_ts), [[], [], []])
      const events = (yield* deliveries("stop-no-stream")).flat().filter((event) => event._tag === "StopRequested")
      assert.deepStrictEqual(events.map((event) => event.messageIds), [[], [], []])
      assert.strictEqual(new Set(events.map(dedupeKey)).size, 3)
    }))
})
