import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { tokens } from "@effect/chat-discord/internal/mentions"
import { decodeMessageFields, message, messageTypes } from "@effect/chat-discord/internal/normalize"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { dedupeKey } from "effect/chat/ChatEvent"
import { checkEvent, checkMessage } from "effect/chat/ChatTest"
import * as ChatThread from "effect/chat/ChatThread"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import {
  botUserId,
  checkOptions,
  type Dispatch,
  eventFixtures,
  events,
  forum,
  guild,
  recorded,
  role,
  scratch,
  step,
  test,
  tim,
  webhook
} from "./utils.ts"

const context = { botUserId }

const normalize = (dispatch: Dispatch): ReadonlyArray<ChatEvent.ChatEvent> => {
  const result = DiscordChat.normalize(dispatch, context)
  assert(Result.isSuccess(result), "expected events")
  return result.success
}

const created = (dispatch: Dispatch): ChatEvent.MessageCreated => {
  const found = normalize(dispatch)
  assert.strictEqual(found.length, 1)
  const event = found[0]
  assert(event._tag === "MessageCreated")
  return event
}

const byContent = (name: string, prefix: string): Dispatch => {
  const found = events(name).filter((dispatch) => String(dispatch.d.content).startsWith(prefix))
  assert.strictEqual(found.length, 1, prefix)
  return found[0]
}

const mentionsOf = (event: ChatEvent.MessageCreated) =>
  event.message.mentions.map((mention) => ({
    kind: mention.kind,
    id: mention.id,
    isSelf: mention.isSelf,
    token: event.message.text.slice(mention.start, mention.end)
  }))

describe("normalize", () => {
  it.effect("every recorded dispatch passes checkEvent", () =>
    Effect.gen(function*() {
      let count = 0
      for (const name of eventFixtures()) {
        for (const dispatch of events(name)) {
          const result = DiscordChat.normalize(dispatch, { ...context, channelType: 0 })
          assert(Result.isSuccess(result), name)
          for (const event of result.success) {
            yield* checkEvent(event, checkOptions)
            count++
          }
        }
      }
      assert.isAbove(count, 35)
    }))

  it("a MESSAGE_CREATE with channel_type gives a channel message", () => {
    const event = created(events("channel-message")[0])
    assert.strictEqual(event.kind, "channel")
    assert.deepStrictEqual(event.thread, DiscordChat.thread(scratch))
    assert.deepStrictEqual(event.thread, event.message.thread)
    assert.strictEqual(event.message.text, "Fixture: a plain message in a guild text channel")
    assert.isTrue(event.message.author.isSelf)
    assert.isTrue(event.message.author.isBot)
    assert.deepStrictEqual(event.raw, events("channel-message")[0].d)
    assert.strictEqual(event.message.raw, event.raw)
  })

  it("a MESSAGE_CREATE without channel_type fails MissingChannelType, then takes it from the context", () => {
    const dispatch = events("channel-message-without-channel-type")[0]
    assert.isUndefined(dispatch.d.channel_type)
    const missing = DiscordChat.normalize(dispatch, context)
    assert(Result.isFailure(missing))
    assert.instanceOf(missing.failure, DiscordChat.MissingChannelType)
    assert.strictEqual(missing.failure.channelId, scratch)
    for (
      const [channelType, kind] of [[0, "channel"], [11, "thread"], [1, "direct"], [15, "channel"], [
        99,
        "channel"
      ]] as const
    ) {
      const result = DiscordChat.normalize(dispatch, { ...context, channelType })
      assert(Result.isSuccess(result))
      const event = result.success[0]
      assert(event._tag === "MessageCreated")
      assert.strictEqual(event.kind, kind)
    }
    // The payload's own type wins over the context.
    const withType = DiscordChat.normalize(events("channel-message")[0], { ...context, channelType: 11 })
    assert(Result.isSuccess(withType) && withType.success[0]._tag === "MessageCreated")
    assert.strictEqual(withType.success[0].kind, "channel")
  })

  it("a reaction needs no channel type", () => {
    for (const dispatch of events("reactions")) {
      const result = DiscordChat.normalize(dispatch, context)
      assert(Result.isSuccess(result))
      assert.strictEqual(result.success.length, 1)
    }
  })

  it("a message in a thread is addressed to the thread", () => {
    for (const dispatch of events("thread-messages")) {
      const event = created(dispatch)
      assert.strictEqual(event.kind, "thread")
      assert.deepStrictEqual(event.thread, DiscordChat.thread(dispatch.d.channel_id))
      assert.notStrictEqual(dispatch.d.channel_id, scratch)
    }
  })

  it("a forum post's starter is addressed to the post, whose id it shares", () => {
    const [starter, reply] = events("forum").map(created)
    assert.strictEqual(starter.kind, "thread")
    assert.strictEqual(starter.message.id, starter.thread.id)
    assert.deepStrictEqual(reply.thread, starter.thread)
    assert.strictEqual(DiscordChat.guildId(starter).pipe(Option.getOrThrow), guild)
  })

  it("THREAD_STARTER_MESSAGE and THREAD_CREATED give no event", () => {
    const dispatches = events("thread-started")
    assert.deepStrictEqual(dispatches.map((dispatch) => dispatch.d.type).sort(), [18, 21, 21])
    for (const dispatch of dispatches) assert.deepStrictEqual(normalize(dispatch), [])
  })

  it("only DEFAULT, REPLY, CHAT_INPUT_COMMAND and CONTEXT_MENU_COMMAND are messages", () => {
    assert.deepStrictEqual([...messageTypes].sort((a, b) => a - b), [0, 19, 20, 23])
    const base = events("channel-message")[0]
    for (const type of [1, 6, 7, 8, 18, 21, 24, 46, 99]) {
      assert.deepStrictEqual(normalize({ t: base.t, d: { ...base.d, type } }), [], String(type))
    }
  })

  it("a webhook message has the webhook as its author", () => {
    const event = created(events("webhook-message")[0])
    assert.strictEqual(event.message.author.id, webhook)
    assert.strictEqual(event.message.author.name, "effect-chat-fixtures")
    assert.isTrue(event.message.author.isBot)
    assert.isFalse(event.message.author.isSelf)
    assert.isTrue(Option.isNone(DiscordChat.member(event)))
    assert.strictEqual(Option.getOrThrow(DiscordChat.guildId(event)), guild)
  })

  it("a person's reply is a reply, not a mention, with the ping on or off", () => {
    const [pingOn, pingOff] = events("reply-ping").filter((dispatch) => dispatch.d.author.id === tim)
    // Discord lists the replied-to bot in mentions when the ping is on, with no token in content.
    assert.deepStrictEqual(pingOn.d.mentions.map((user: any) => user.id), [botUserId])
    assert.deepStrictEqual(pingOff.d.mentions, [])
    for (const dispatch of [pingOn, pingOff]) {
      const event = created(dispatch)
      assert.deepStrictEqual(event.message.mentions, [])
      assert.deepStrictEqual(event.message.replyTo, {
        messageId: dispatch.d.message_reference.message_id,
        authorId: botUserId
      })
      assert.isFalse(event.message.author.isBot)
      assert.isFalse(event.message.author.isSelf)
      assert.strictEqual(event.message.author.id, tim)
      assert.deepStrictEqual(event.thread, DiscordChat.thread(test))
      const member = Option.getOrThrow(DiscordChat.member(event))
      assert.strictEqual(member.guildId, guild)
      assert.deepStrictEqual(member.roles, dispatch.d.member.roles)
    }
  })

  it("the bot's own replies, ping on or off, carry replyTo and no mention", () => {
    for (const prefix of ["Fixture: a reply with the ping on", "Fixture: a reply with the ping off"]) {
      const event = created(byContent("reply-ping", prefix))
      assert.deepStrictEqual(event.message.mentions, [])
      assert.strictEqual(event.message.replyTo?.authorId, botUserId)
    }
  })

  it("an attachment has an id that names its message, and no URL", () => {
    const event = created(events("attachment")[0])
    assert.deepStrictEqual(event.message.attachments, [{
      id: `${event.message.id}/${events("attachment")[0].d.attachments[0].id}`,
      name: "fixture.txt",
      contentType: "text/plain; charset=utf-8",
      size: 23
    }])
  })

  describe("mentions", () => {
    const cases: ReadonlyArray<
      readonly [string, ReadonlyArray<{ kind: string; id: string; isSelf: boolean; token: string }>]
    > = [
      ["Fixture: <@1564742987727118426> as a plain", [{
        kind: "user",
        id: botUserId,
        isSelf: true,
        token: `<@${botUserId}>`
      }]],
      ["Fixture: <@!", [{ kind: "user", id: botUserId, isSelf: true, token: `<@!${botUserId}>` }]],
      [`Fixture: <@${tim}>`, [{ kind: "user", id: tim, isSelf: false, token: `<@${tim}>` }]],
      ["Fixture: <@&", [{ kind: "role", id: role, isSelf: false, token: `<@&${role}>` }]],
      ["Fixture: @everyone that", [{ kind: "broadcast", id: "everyone", isSelf: false, token: "@everyone" }]],
      ["Fixture: @here", [{ kind: "broadcast", id: "here", isSelf: false, token: "@here" }]],
      ["Fixture: @everyone with parse", []],
      ["Fixture: <#", [{ kind: "channel", id: test, isSelf: false, token: `<#${test}>` }]],
      ["Fixture: `<@", []],
      ["Fixture: in a fence", []],
      ["Fixture: the bot naming", []],
      ["Fixture: <@1564742987727118426> and", [
        { kind: "user", id: botUserId, isSelf: true, token: `<@${botUserId}>` },
        { kind: "role", id: role, isSelf: false, token: `<@&${role}>` },
        { kind: "channel", id: scratch, isSelf: false, token: `<#${scratch}>` }
      ]]
    ]
    for (const [prefix, expected] of cases) {
      it.effect(prefix, () =>
        Effect.gen(function*() {
          const event = created(byContent("mentions", prefix))
          assert.deepStrictEqual(mentionsOf(event), expected)
          yield* checkMessage(event.message, checkOptions)
        }))
    }

    it("tokens skips code and escapes as Discord's Markdown does", () => {
      const ids = (text: string) => tokens(text).map((token) => token.id)
      assert.deepStrictEqual(ids("<@1> `<@2>` ``<@3>`` ```\n<@4>\n``` <@5>"), ["1", "5"])
      assert.deepStrictEqual(ids("\\<@1> <@2>"), ["2"])
      assert.deepStrictEqual(ids("`unclosed <@1>"), ["1"])
      assert.deepStrictEqual(ids("a``b <@1>"), ["1"])
      assert.deepStrictEqual(ids("@everyone@here <@&3><#4>"), ["everyone", "here", "3", "4"])
    })

    it("parseMention reads one whole token", () => {
      assert.deepStrictEqual(DiscordChat.parseMention("<@1>"), Option.some({ kind: "user" as const, id: "1" }))
      assert.deepStrictEqual(DiscordChat.parseMention("<@!1>"), Option.some({ kind: "user" as const, id: "1" }))
      assert.deepStrictEqual(DiscordChat.parseMention("<@&2>"), Option.some({ kind: "role" as const, id: "2" }))
      assert.deepStrictEqual(DiscordChat.parseMention("<#3>"), Option.some({ kind: "channel" as const, id: "3" }))
      assert.deepStrictEqual(DiscordChat.parseMention("@here"), Option.some({ kind: "broadcast" as const, id: "here" }))
      for (const slice of ["<@1> ", " <@1>", "<@x>", "@everyone!", "<@1><@2>", ""]) {
        assert.isTrue(Option.isNone(DiscordChat.parseMention(slice)), slice)
      }
    })
  })

  describe("reactions", () => {
    it.effect("added and removed, in a channel and a thread", () =>
      Effect.gen(function*() {
        const found = events("reactions").map(normalize).map((list) => list[0])
        assert.strictEqual(found.length, 12)
        for (const event of found) {
          assert(event._tag === "ReactionAdded" || event._tag === "ReactionRemoved")
          yield* checkEvent(event, checkOptions)
          assert.strictEqual(event.userId, botUserId)
          assert.isUndefined(event.timestamp)
          assert.strictEqual(Option.getOrThrow(DiscordChat.guildId(event)), guild)
          if (event._tag === "ReactionAdded") {
            assert.strictEqual(event.messageAuthorId, botUserId)
            assert.isTrue(Option.isSome(DiscordChat.member(event)))
          } else {
            assert.isUndefined(event.messageAuthorId)
          }
        }
        assert.deepStrictEqual(found.slice(0, 3).map((event) => event._tag === "ReactionAdded" ? event.emoji : ""), [
          "\u{1F44D}",
          "\u{1F44D}\u{1F3FD}",
          "custom:effectchat"
        ])
        assert.notStrictEqual(dedupeKey(found[0]), dedupeKey(found[3]))
        assert.deepStrictEqual(found[6].thread, DiscordChat.thread("1570608327602471024"))
      }))

    it("the custom emoji's id stays on raw", () => {
      const event = normalize(events("reactions")[2])[0]
      assert.strictEqual((event.raw as any).emoji.id, "1570607258226790481")
    })
  })
})

/**
 * Synthetic: nobody has yet sent these for the recorder. Each one is a
 * recorded dispatch with the fields that differ changed by hand.
 */
describe("synthetic", () => {
  const person = events("reply-ping").find((dispatch) => dispatch.d.author.id === tim)!
  const fromPerson = (d: Record<string, unknown>): Dispatch => {
    const { message_reference: _, referenced_message: __, ...rest } = person.d
    return { t: "MESSAGE_CREATE", d: { ...rest, type: 0, mentions: [], ...d } }
  }

  it.effect("a person mentioning the bot in a guild channel", () =>
    Effect.gen(function*() {
      const event = created(fromPerson({
        content: `<@${botUserId}> hello`,
        mentions: [person.d.referenced_message.author]
      }))
      assert.deepStrictEqual(mentionsOf(event), [{
        kind: "user",
        id: botUserId,
        isSelf: true,
        token: `<@${botUserId}>`
      }])
      assert.isFalse(event.message.author.isBot)
      assert.strictEqual(event.kind, "channel")
      yield* checkEvent(event, checkOptions)
    }))

  it.effect("a DM to the bot", () =>
    Effect.gen(function*() {
      const { guild_id: _, member: __, ...rest } = fromPerson({ content: "hello", channel_id: "1", channel_type: 1 }).d
      const event = created({ t: "MESSAGE_CREATE", d: rest })
      assert.strictEqual(event.kind, "direct")
      assert.isTrue(Option.isNone(DiscordChat.guildId(event)))
      assert.isTrue(Option.isNone(DiscordChat.member(event)))
      yield* checkEvent(event, checkOptions)
    }))

  it.effect("a forward comes through as DEFAULT with empty text", () =>
    Effect.gen(function*() {
      const snapshot = { message: { content: "forwarded", type: 0, timestamp: person.d.timestamp } }
      const event = created(fromPerson({
        content: "",
        message_reference: { type: 1, channel_id: scratch, message_id: "1" },
        message_snapshots: [snapshot]
      }))
      assert.strictEqual(event.message.text, "")
      assert.isUndefined(event.message.replyTo)
      assert.deepStrictEqual((event.raw as any).message_snapshots, [snapshot])
      yield* checkEvent(event, checkOptions)
    }))

  it.effect("slash command replies, immediate and deferred, and a context menu reply", () =>
    Effect.gen(function*() {
      const recordedReply = step("other-bots", "other-bot-command-reply").response
      const reply = (d: Record<string, unknown>): Dispatch => ({
        t: "MESSAGE_CREATE",
        d: { ...recordedReply, guild_id: guild, channel_type: 0, ...d }
      })
      const immediate = created(reply({}))
      assert.isTrue(immediate.message.author.isBot)
      assert.strictEqual(immediate.message.text, recordedReply.content)
      // Deferred: empty with the LOADING flag. The text comes in a MESSAGE_UPDATE, which is not delivered.
      const deferred = created(reply({ content: "", flags: 128 }))
      assert.strictEqual(deferred.message.text, "")
      assert.deepStrictEqual(normalize({ t: "MESSAGE_UPDATE", d: { ...recordedReply, flags: 0 } }), [])
      const contextMenu = created(reply({ type: 23 }))
      assert.isTrue(contextMenu.message.author.isBot)
      for (const event of [immediate, deferred, contextMenu]) yield* checkEvent(event, checkOptions)
    }))
})

describe("REST messages", () => {
  const read = (raw: any) => {
    const fields = decodeMessageFields(raw)
    assert.isDefined(fields)
    return message(raw, fields!, context)
  }

  it.effect("every recorded message passes checkMessage", () =>
    Effect.gen(function*() {
      let count = 0
      for (const name of ["posts", "history", "other-bots", "reactions", "embeds"]) {
        for (const call of recorded(name)) {
          if (call.status >= 300 || call.response === null) continue
          const list = Array.isArray(call.response) ? call.response : [call.response]
          for (const raw of list) {
            if (typeof raw.author !== "object") continue
            const found = read(raw)
            if (found === undefined) continue
            yield* checkMessage(found, checkOptions)
            count++
          }
        }
      }
      assert.isAbove(count, 30)
    }))

  it("other bots' command replies are messages from a bot", () => {
    for (
      const name of ["other-bot-command-reply", "other-bot-command-reply-empty", "other-bot-command-reply-effect-bot"]
    ) {
      const raw = step("other-bots", name).response
      assert.strictEqual(raw.type, 20)
      const found = read(raw)!
      assert.isTrue(found.author.isBot)
      assert.isFalse(found.author.isSelf)
      assert.isUndefined(found.replyTo)
    }
    // A reply with only an embed comes through with empty text.
    assert.strictEqual(read(step("other-bots", "other-bot-command-reply-empty").response)!.text, "")
    const reply = read(step("other-bots", "other-bot-reply").response)!
    assert.strictEqual(reply.replyTo?.messageId, "1103552216398303272")
  })

  it("the thread starter placeholder is not a message", () => {
    const history = step("history", "thread-history").response
    const placeholder = history.find((raw: any) => raw.type === 21)
    assert.isUndefined(read(placeholder))
    // The opener it points at is addressed to the parent channel.
    const opener = read(placeholder.referenced_message)!
    assert.deepStrictEqual(opener.thread, ChatThread.make("discord", scratch))
    assert.strictEqual(opener.id, step("history", "thread-start").response.id)
  })

  it("a forum's starter read through REST is addressed to the post", () => {
    const starter = read(step("history", "forum-get-starter").response)!
    assert.strictEqual(starter.thread.id, starter.id)
    assert.notStrictEqual(starter.thread.id, forum)
  })
})
