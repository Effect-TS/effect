import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { dedupeKey } from "effect/chat/ChatEvent"
import { checkEvent, checkMessage } from "effect/chat/ChatTest"
import * as Effect from "effect/Effect"
import { botUserId, channel, checkOptions, fixture, messageEnvelope, recordedMessages, team } from "./utils.ts"

const context = { teamId: team, botUserId }

const created = (events: ReadonlyArray<ChatEvent.ChatEvent>): ChatEvent.MessageCreated => {
  assert.strictEqual(events.length, 1)
  const event = events[0]
  assert(event._tag === "MessageCreated")
  return event
}

/**
 * A `message` and an `app_mention` envelope built from one read-back message,
 * checked as a pair. This shows the two shapes normalise alike for every
 * recorded message. It is not a captured pair: those are in `events.test.ts`.
 */
const pair = Effect.fnUntraced(function*(
  message: Record<string, unknown>,
  options?: { readonly channel?: string; readonly channelType?: string }
) {
  const fromMessage = created(SlackChat.normalize(messageEnvelope(message, options), context))
  yield* checkEvent(fromMessage, checkOptions)
  if (message.edited !== undefined) {
    // An edit reuses the id of a message already delivered.
    assert.deepStrictEqual(
      SlackChat.normalize(messageEnvelope(message, { ...options, type: "app_mention" }), context),
      []
    )
    return fromMessage
  }
  const fromMention = created(
    SlackChat.normalize(messageEnvelope(message, { ...options, type: "app_mention" }), context)
  )
  yield* checkEvent(fromMention, checkOptions)
  assert.strictEqual(dedupeKey(fromMessage), dedupeKey(fromMention))
  const { raw: _a, ...left } = fromMessage.message
  const { raw: _b, ...right } = fromMention.message
  assert.deepStrictEqual(left, right)
  assert.deepStrictEqual(fromMessage.thread, fromMention.thread)
  return fromMessage
})

describe("normalize", () => {
  it.effect("every recorded message passes checkMessage as a pair", () =>
    Effect.gen(function*() {
      const names = [
        "markdown-mentions",
        "me-message",
        "thread-broadcast",
        "thread-root-before-after",
        "file-share",
        "stream",
        "unfurl-edit"
      ]
      let count = 0
      for (const name of names) {
        for (const message of recordedMessages(name).values()) {
          const event = yield* pair(message)
          yield* checkMessage(event.message, checkOptions)
          count++
        }
      }
      assert.isAbove(count, 10)
    }))

  it.effect("mentions come from rich_text, not from code in text", () =>
    Effect.gen(function*() {
      const message = recordedMessages("markdown-mentions").get("1794509003.143939")
      const event = yield* pair(message)
      assert.deepStrictEqual(
        event.message.mentions.map(({ id, isSelf, kind }) => ({ kind, id, isSelf })),
        [{ kind: "user", id: botUserId, isSelf: true }, { kind: "channel", id: channel, isSelf: false }]
      )
      const [user] = event.message.mentions
      assert.strictEqual(event.message.text.slice(user.start, user.end), `<@${botUserId}>`)
      assert.isBelow(user.start, event.message.text.indexOf("Inline code"))
    }))

  it.effect("without rich_text, text is scanned outside code", () =>
    Effect.gen(function*() {
      const event = created(SlackChat.normalize(
        messageEnvelope({
          ts: "1794509003.000001",
          user: "U080YLYB277",
          text: "hey <@U0CCLMD4S1L> `<@U999>` and <!here>"
        }),
        context
      ))
      yield* checkEvent(event, checkOptions)
      assert.deepStrictEqual(event.message.mentions.map((mention) => mention.id), [botUserId, "here"])
      assert.isTrue(event.message.mentions[0].isSelf)
      assert.isFalse(event.message.author.isSelf)
    }))

  it.effect("text never adds a mention the rich_text block lacks", () =>
    Effect.gen(function*() {
      const section = (
        elements: Array<unknown>
      ) => [{ type: "rich_text", elements: [{ type: "rich_text_section", elements }] }]
      // Block items: literal U1, real U1, real U2, literal bot.
      const event = created(SlackChat.normalize(
        messageEnvelope({
          ts: "1794509003.000002",
          user: "U080YLYB277",
          text: `<@U1AAAA> <@U2BBBB> <@${botUserId}>`,
          blocks: section([
            { type: "text", text: "<@U1AAAA>" },
            { type: "user", user_id: "U1AAAA" },
            { type: "text", text: " " },
            { type: "user", user_id: "U2BBBB" },
            { type: "text", text: ` <@${botUserId}>` }
          ])
        }),
        context
      ))
      yield* checkEvent(event, checkOptions)
      assert.deepStrictEqual(
        event.message.mentions.map(({ id, isSelf, start }) => ({ id, isSelf, start })),
        [{ id: "U1AAAA", isSelf: false, start: 0 }, { id: "U2BBBB", isSelf: false, start: 10 }]
      )
      // Two real U1 in the block and one token in text: one mention, at the token.
      const short = created(SlackChat.normalize(
        messageEnvelope({
          ts: "1794509003.000003",
          user: "U080YLYB277",
          text: `hi <@U1AAAA> <@${botUserId}>`,
          blocks: section([
            { type: "user", user_id: "U1AAAA" },
            { type: "user", user_id: "U1AAAA" },
            { type: "text", text: ` <@${botUserId}>` }
          ])
        }),
        context
      ))
      assert.deepStrictEqual(
        short.message.mentions.map(({ id, start }) => ({ id, start })),
        [{ id: "U1AAAA", start: 3 }]
      )
    }))

  it.effect("a real mention with no token in text, past a literal, ends", () =>
    Effect.gen(function*() {
      // Block items: real U1, literal U9, real U2. Text has only U1.
      const event = created(SlackChat.normalize(
        messageEnvelope({
          ts: "1794509003.000004",
          user: "U080YLYB277",
          text: "<@U1AAAA>",
          blocks: [{
            type: "rich_text",
            elements: [{
              type: "rich_text_section",
              elements: [
                { type: "user", user_id: "U1AAAA" },
                { type: "text", text: " <@U9ZZZZ> " },
                { type: "user", user_id: "U2BBBB" }
              ]
            }]
          }]
        }),
        context
      ))
      yield* checkEvent(event, checkOptions)
      assert.deepStrictEqual(
        event.message.mentions.map(({ id, start }) => ({ id, start })),
        [{ id: "U1AAAA", start: 0 }]
      )
    }))

  it.effect("files are attachments, with an id and no URL", () =>
    Effect.gen(function*() {
      const reply = recordedMessages("file-share").get("1794509028.831169")
      const event = yield* pair(reply)
      assert.strictEqual(event.message.attachments.length, 1)
      assert.deepStrictEqual(event.message.attachments[0], {
        id: "F0CH6RHTMRU",
        name: "fixture.txt",
        contentType: "text/plain",
        size: 51
      })
    }))

  it.effect("a D channel is a direct", () =>
    Effect.gen(function*() {
      const event = yield* pair(
        { ts: "1794509003.000002", user: "U080YLYB277", text: "hi" },
        { channel: "D0CCGDG0E75" }
      )
      assert.strictEqual(event.kind, "direct")
      const group = yield* pair(
        { ts: "1794509003.000003", user: "U080YLYB277", text: "hi" },
        { channel: "C0GROUP", channelType: "mpim" }
      )
      assert.strictEqual(group.kind, "direct")
    }))

  it.effect("a bot_message's author is its bot_id", () =>
    Effect.gen(function*() {
      const event = yield* pair({
        ts: "1794509003.000004",
        subtype: "bot_message",
        bot_id: "B0WEBHOOK",
        username: "incoming-webhook",
        text: "deploy done <@U0CCLMD4S1L>"
      })
      assert.deepStrictEqual(event.message.author, {
        id: "B0WEBHOOK",
        name: "incoming-webhook",
        isBot: true,
        isSelf: false
      })
    }))

  it("drops other subtypes, other workspaces and other types", () => {
    const message = { ts: "1794509003.000005", user: "U080YLYB277", text: "<@U0CCLMD4S1L>" }
    assert.deepStrictEqual(SlackChat.normalize(messageEnvelope({ ...message, subtype: "channel_join" }), context), [])
    assert.deepStrictEqual(SlackChat.normalize(messageEnvelope(message, { teamId: "T0OTHER" }), context), [])
    assert.deepStrictEqual(SlackChat.normalize({ type: "url_verification", challenge: "x" }, context), [])
    assert.deepStrictEqual(SlackChat.normalize(null, context), [])
  })

  it("drops the verification token from raw", () => {
    const event = created(SlackChat.normalize(
      messageEnvelope({ ts: "1794509003.000006", user: "U080YLYB277", text: "hi" }),
      context
    ))
    assert.isFalse("token" in (event.raw as object))
  })
})

describe("reactions", () => {
  const reaction = (name: string) => ({
    team_id: team,
    api_app_id: "A0CCHBHDK7X",
    type: "event_callback",
    event_id: "Ev02",
    event_time: 1794509100,
    event: {
      type: "reaction_added",
      user: "U080YLYB277",
      reaction: name,
      item_user: botUserId,
      item: { type: "message", channel, ts: "1794509003.143939" },
      event_ts: "1794509100.000100"
    }
  })

  it.effect("a name with two tones is a custom emoji, on the reacted message's author", () =>
    Effect.gen(function*() {
      // No recording has a two-tone reaction, so its name is not resolved
      // (stage 0 fixture 16).
      const [event] = SlackChat.normalize(reaction("handshake::skin-tone-2::skin-tone-5"), context)
      assert(event._tag === "ReactionAdded")
      assert.strictEqual(event.emoji, "custom:handshake::skin-tone-2::skin-tone-5")
      assert.strictEqual(event.messageAuthorId, botUserId)
      assert.deepStrictEqual(event.thread, SlackChat.thread({ team, channel }))
      yield* checkEvent(event, checkOptions)
    }))
})

describe("agent_session_stopped", () => {
  it.effect("a stop in a direct message", () =>
    Effect.gen(function*() {
      const envelope = fixture("agent-session-stopped").cases.direct
      const [event] = SlackChat.normalize(envelope, context)
      assert(event._tag === "StopRequested")
      yield* checkEvent(event, checkOptions)
      assert.deepStrictEqual(
        event.thread,
        SlackChat.thread({ team, channel: "D0CCGDG0E75", threadTs: envelope.event.thread_ts })
      )
      assert.deepStrictEqual(event.messageIds, ["1794454526.283939"])
      assert.strictEqual(event.userId, "U080YLYB277")
    }))
})
