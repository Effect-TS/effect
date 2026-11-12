import { extract } from "@effect/chat-slack/internal/mentions"
import { messageSubtypes } from "@effect/chat-slack/internal/normalize"
import * as SlackChat from "@effect/chat-slack/SlackChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { dedupeKey } from "effect/chat/ChatEvent"
import { checkEvent, checkMessage } from "effect/chat/ChatTest"
import * as ChatThread from "effect/chat/ChatThread"
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
 * checked as a pair. This shows the two shapes normalise alike. It is not a
 * captured pair: Slack sends no `app_mention` for the bot's own messages.
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

  it("alignment ends and reports only real items, for every small case", () => {
    const ids = ["U1AAAA", "U2BBBB", "U3CCCC"]
    let seed = 7
    const next = (bound: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % bound
    }
    for (let round = 0; round < 2_000; round++) {
      const items = Array.from({ length: next(6) }, () => ({ id: ids[next(3)], real: next(2) === 0 }))
      const text = Array.from({ length: next(6) }, () => `<@${ids[next(3)]}>`).join(" ")
      const blocks = [{
        type: "rich_text",
        elements: [{
          type: "rich_text_section",
          elements: items.map((item) =>
            item.real ? { type: "user", user_id: item.id } : { type: "text", text: ` <@${item.id}> ` }
          )
        }]
      }]
      const mentions = extract(text, blocks, botUserId)
      const real = items.filter((item) => item.real).map((item) => item.id)
      assert.isAtMost(mentions.length, real.length)
      for (const id of new Set(mentions.map((mention) => mention.id))) {
        assert.isAtMost(
          mentions.filter((mention) => mention.id === id).length,
          real.filter((item) => item === id).length,
          JSON.stringify({ text, items })
        )
      }
      const starts = mentions.map((mention) => mention.start)
      assert.strictEqual(new Set(starts).size, starts.length)
      for (const mention of mentions) assert.strictEqual(text.slice(mention.start, mention.end), `<@${mention.id}>`)
    }
  })

  it.effect("a /me line that mentions the bot is a message", () =>
    Effect.gen(function*() {
      const [message] = recordedMessages("me-message").values()
      assert.strictEqual(message.subtype, "me_message")
      const event = yield* pair(message)
      assert.strictEqual(event.message.mentions.length, 1)
      assert.isTrue(event.message.mentions[0].isSelf)
    }))

  it.effect("a thread_broadcast is addressed to its thread", () =>
    Effect.gen(function*() {
      const broadcast = [...recordedMessages("thread-broadcast").values()].find((m) => m.subtype === "thread_broadcast")
      const event = yield* pair(broadcast)
      assert.strictEqual(event.kind, "thread")
      assert.deepStrictEqual(event.thread, SlackChat.thread({ team, channel, threadTs: broadcast.thread_ts }))
    }))

  it.effect("a thread root keeps its channel address after its first reply", () =>
    Effect.gen(function*() {
      const calls = fixture("thread-root-before-after").calls.filter((call) => call.method === "conversations.history")
      const before = calls[0].response.messages[0]
      const after = calls[1].response.messages.find((m: any) => m.ts === before.ts)
      assert.strictEqual(after.thread_ts, after.ts)
      const one = yield* pair(before)
      const two = yield* pair(after)
      assert.deepStrictEqual(one.thread, SlackChat.thread({ team, channel }))
      assert.deepStrictEqual(two.thread, one.thread)
      assert.strictEqual(dedupeKey(one), dedupeKey(two))
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

  it("drops an edited app_mention, other subtypes, other workspaces and other types", () => {
    const message = { ts: "1794509003.000005", user: "U080YLYB277", text: "<@U0CCLMD4S1L>" }
    const edited = messageEnvelope({ ...message, edited: { user: "U080YLYB277", ts: "1794509010.000000" } }, {
      type: "app_mention"
    })
    assert.deepStrictEqual(SlackChat.normalize(edited, context), [])
    for (const subtype of ["channel_join", "message_changed", "message_deleted", "assistant_app_thread"]) {
      assert.deepStrictEqual(SlackChat.normalize(messageEnvelope({ ...message, subtype }), context), [])
    }
    assert.deepStrictEqual(SlackChat.normalize(messageEnvelope(message, { teamId: "T0OTHER" }), context), [])
    assert.deepStrictEqual(SlackChat.normalize({ type: "url_verification", challenge: "x" }, context), [])
    assert.deepStrictEqual(SlackChat.normalize(null, context), [])
    assert.deepStrictEqual([...messageSubtypes].sort(), ["bot_message", "file_share", "me_message", "thread_broadcast"])
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
  const reaction = (type: "reaction_added" | "reaction_removed", name: string) => ({
    team_id: team,
    api_app_id: "A0CCHBHDK7X",
    type: "event_callback",
    event_id: "Ev02",
    event_time: 1794509100,
    event: {
      type,
      user: "U080YLYB277",
      reaction: name,
      item_user: botUserId,
      item: { type: "message", channel, ts: "1794509003.143939" },
      event_ts: "1794509100.000100"
    }
  })

  it.effect("plain, toned and custom emoji", () =>
    Effect.gen(function*() {
      // The names Slack stored in the reactions fixture.
      const names = fixture("reactions").calls
        .filter((call) => call.method === "reactions.add" && call.response.ok === true)
        .map((call) => call.request.name as string)
      assert.includeMembers(names, ["grinning", "+1::skin-tone-3"])
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["grinning", "😀"],
        ["+1", "👍"],
        ["thumbsup", "👍"],
        ["+1::skin-tone-3", "👍🏼"],
        ["party-parrot", "custom:party-parrot"]
      ]
      for (const [name, emoji] of cases) {
        const added = SlackChat.normalize(reaction("reaction_added", name), context)
        const removed = SlackChat.normalize(reaction("reaction_removed", name), context)
        assert.strictEqual(added.length, 1)
        const event = added[0]
        assert(event._tag === "ReactionAdded")
        assert.strictEqual(event.emoji, emoji)
        assert.strictEqual(event.messageAuthorId, botUserId)
        assert.deepStrictEqual(event.thread, SlackChat.thread({ team, channel }))
        yield* checkEvent(event, checkOptions)
        yield* checkEvent(removed[0], checkOptions)
        assert.notStrictEqual(dedupeKey(event), dedupeKey(removed[0]))
      }
    }))
})

describe("agent_session_stopped", () => {
  const cases = fixture("agent-session-stopped").cases

  it.effect("the three captured payloads", () =>
    Effect.gen(function*() {
      const expected: Record<string, { readonly channel: string; readonly messageIds: ReadonlyArray<string> }> = {
        channelThread: { channel, messageIds: ["1794454017.726189"] },
        noStream: { channel, messageIds: [] },
        direct: { channel: "D0CCGDG0E75", messageIds: ["1794454526.283939"] }
      }
      for (const [name, envelope] of Object.entries(cases)) {
        const events = SlackChat.normalize(envelope, context)
        assert.strictEqual(events.length, 1)
        const event = events[0]
        assert(event._tag === "StopRequested")
        yield* checkEvent(event, checkOptions)
        const { channel: eventChannel, messageIds } = expected[name]
        const raw = envelope as any
        assert.deepStrictEqual(
          event.thread,
          SlackChat.thread({ team, channel: eventChannel, threadTs: raw.event.thread_ts })
        )
        assert.deepStrictEqual(event.messageIds, messageIds)
        assert.strictEqual(event.userId, "U080YLYB277")
        assert.strictEqual(dedupeKey(event), `stop/${ChatThread.toString(event.thread)}/${raw.event.event_ts}`)
      }
    }))

  it("an empty streaming_message_ts gives no message ids", () => {
    const envelope = structuredClone(cases.channelThread)
    envelope.event.streaming_message_ts = []
    const [event] = SlackChat.normalize(envelope, context)
    assert(event._tag === "StopRequested")
    assert.deepStrictEqual(event.messageIds, [])
  })
})
