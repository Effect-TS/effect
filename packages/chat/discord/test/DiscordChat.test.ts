import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { assert, describe, it } from "@effect/vitest"
import type * as ChatEvent from "effect/chat/ChatEvent"
import { ChatHandler, NotAccepted } from "effect/chat/ChatHandler"
import { checkMessage } from "effect/chat/ChatTest"
import type * as ChatUi from "effect/chat/ChatUi"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import {
  adapter,
  answer,
  botUserId,
  checkOptions,
  discordLayer,
  errorResponse,
  events,
  type Fake,
  guild,
  makeFake,
  scratch,
  statusCodeError,
  step,
  tim
} from "./utils.ts"

const run = <A, E>(fake: Fake, effect: Effect.Effect<A, E, any>, options?: { readonly download?: Uint8Array }) =>
  effect.pipe(Effect.provide(discordLayer(fake, options))) as Effect.Effect<A, E>

const reason = <A>(effect: Effect.Effect<A, any>) =>
  Effect.flip(effect).pipe(
    Effect.map((error) => ({ op: error.op, tag: error.reason._tag, detail: error.reason.detail, retry: error.retry }))
  )

const channel = DiscordChat.thread(scratch)
const posted = step("posts", "channel-plain").response

const history = step("history", "thread-history")
const threadId: string = step("history", "thread-start").response.id
const thread = DiscordChat.thread(threadId)
const threadChannel = step("history", "thread-get-channel").response

const noMentions = { parse: [], users: [], roles: [], replied_user: false }

describe("post", () => {
  it.effect("sends the Markdown as is, notifying nobody and suppressing embeds", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* discord.post(channel, { markdown: "hi <@1> @everyone **bold**" })
        assert.strictEqual(result.id, posted.id)
        assert.deepStrictEqual(result.thread, channel)
        assert.deepStrictEqual(fake.called("createMessage"), [[scratch, {
          content: "hi <@1> @everyone **bold**",
          allowed_mentions: noMentions,
          flags: 4
        }]])
      })
    )
  })

  it.effect("withPostOptions allows mentions and embeds, merging nested calls", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, { markdown: "hi", replyTo: { messageId: "42" } }).pipe(
          DiscordChat.withPostOptions({ notify: { users: ["1"], roles: ["2"], everyone: true, repliedUser: true } }),
          DiscordChat.withPostOptions({ suppressEmbeds: false })
        )
        assert.deepStrictEqual(fake.called("createMessage")[0][1], {
          content: "hi",
          allowed_mentions: { parse: ["everyone"], users: ["1"], roles: ["2"], replied_user: true },
          flags: 0,
          message_reference: { message_id: "42" }
        })
      })
    )
  })

  it.effect("a reply does not ping its author by default", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, { markdown: "hi", replyTo: { messageId: "42", authorId: tim } })
        assert.deepStrictEqual(fake.called("createMessage")[0][1].allowed_mentions, noMentions)
      })
    )
  })

  it.effect("fails TooLarge past 2,000 code points without a call", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.deepStrictEqual(yield* reason(discord.post(channel, { markdown: "a".repeat(2001) })), {
          op: "post",
          tag: "TooLarge",
          detail: "message_too_long",
          retry: "denied"
        })
        assert.deepStrictEqual(
          yield* reason(discord.post(channel, { markdown: "a".repeat(1999) + "\u{1F1EC}\u{1F1E7}" })),
          {
            op: "post",
            tag: "TooLarge",
            detail: "message_too_long",
            retry: "denied"
          }
        )
        assert.strictEqual(fake.calls.length, 0)
        // 2,000 astral emoji are 4,000 UTF-16 units, and Discord took them.
        yield* discord.post(channel, { markdown: "\u{1F600}".repeat(2000) })
        assert.strictEqual(fake.called("createMessage").length, 1)
        assert.strictEqual(discord.descriptor.measure("\u{1F600}".repeat(2000)), 2000)
      })
    )
  })

  it.effect("uploads files with the message", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(step("posts", "attachment-fixed").response) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, {
          markdown: "with a file",
          files: [{ name: "fixture.txt", contentType: "text/plain", content: new TextEncoder().encode("hello") }]
        })
        assert.strictEqual(fake.calls[0].files, 1)
        assert.deepStrictEqual(fake.calls[0].args[1].attachments, [{ id: "0", filename: "fixture.txt" }])
      })
    )
  })

  it.effect("maps Discord's error bodies", () => {
    const errors = (stepName: string) => () => answer(step("errors", stepName))
    const cases = [
      ["post-unknown-channel", { op: "post", tag: "NotFound", detail: "10003", retry: "denied" }],
      ["post-empty", { op: "post", tag: "InvalidRequest", detail: "50006", retry: "denied" }],
      ["length-2001-ascii", { op: "post", tag: "TooLarge", detail: "50035", retry: "denied" }]
    ] as const
    return Effect.forEach(cases, ([stepName, expected]) => {
      const fake = makeFake({ createMessage: errors(stepName) })
      return run(
        fake,
        Effect.gen(function*() {
          const discord = yield* adapter
          assert.deepStrictEqual(yield* reason(discord.post(channel, { markdown: "x" })), expected)
        })
      )
    }, { discard: true })
  })

  it.effect("a 5xx on a write is uncertain and not retried", () => {
    const fake = makeFake({
      createMessage: () => Effect.fail(statusCodeError(502)),
      deleteMessage: () => Effect.fail(errorResponse(403, { code: 50013, message: "Missing Permissions" }))
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.deepStrictEqual(yield* reason(discord.post(channel, { markdown: "x" })), {
          op: "post",
          tag: "PlatformUnavailable",
          detail: "http_502",
          retry: "uncertain"
        })
        assert.strictEqual(fake.called("createMessage").length, 1)
        assert.deepStrictEqual(yield* reason(discord.delete(channel, "1")), {
          op: "delete",
          tag: "Forbidden",
          detail: "50013",
          retry: "denied"
        })
      })
    )
  })

  it.effect("a 5xx on a read is retried", () => {
    let attempts = 0
    const fake = makeFake({
      getMessage: () => attempts++ < 1 ? Effect.fail(statusCodeError(503)) : Effect.succeed(posted)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const fiber = yield* Effect.forkChild(discord.fetchMessage(channel, posted.id))
        yield* TestClock.adjust("1 second")
        const message = yield* Fiber.join(fiber)
        assert.strictEqual(message.id, posted.id)
        assert.strictEqual(fake.called("getMessage").length, 2)
      })
    )
  })

  it.effect("rejects an address that is not a Discord channel id", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* reason(discord.post(DiscordChat.thread("C123"), { markdown: "x" }))
        assert.strictEqual(result.tag, "InvalidRequest")
        assert.strictEqual(fake.calls.length, 0)
      })
    )
  })
})

describe("buttons and selects", () => {
  const button = (i: number): ChatUi.Button => ({ _tag: "Button", id: "b" + i, label: "B" + i })
  const select: ChatUi.Select = {
    _tag: "Select",
    id: "pick",
    placeholder: "Pick",
    options: [{ label: "A", value: "a" }, { label: "B", value: "b" }],
    selected: "b"
  }
  const rowsOf = (fake: Fake) => fake.called("createMessage")[0][1].components

  it.effect("go out as action rows: five buttons to a row and a select alone in its row", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, {
          markdown: "x",
          actions: [
            { _tag: "Button", id: "go", label: "Go", style: "primary", value: "v" },
            { _tag: "Button", id: "stop", label: "Stop", style: "danger" },
            { _tag: "LinkButton", label: "Docs", url: "https://effect.website" },
            select,
            ...Array.from({ length: 6 }, (_, i) => button(i))
          ]
        })
        assert.deepStrictEqual(rowsOf(fake), [
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: "Go", custom_id: "go\u241Fv" },
              { type: 2, style: 4, label: "Stop", custom_id: "stop" },
              { type: 2, style: 5, label: "Docs", url: "https://effect.website" }
            ]
          },
          {
            type: 1,
            components: [{
              type: 3,
              custom_id: "pick",
              placeholder: "Pick",
              options: [{ label: "A", value: "a" }, { label: "B", value: "b", default: true }],
              min_values: 1,
              max_values: 1
            }]
          },
          {
            type: 1,
            components: [0, 1, 2, 3, 4].map((i) => ({ type: 2, style: 2, label: "B" + i, custom_id: "b" + i }))
          },
          { type: 1, components: [{ type: 2, style: 2, label: "B5", custom_id: "b5" }] }
        ])
      })
    )
  })

  it.effect("fail TooLarge before the call when the rows run out or a custom_id would pass 100", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const post = (actions: ReadonlyArray<ChatUi.Action>) =>
          reason(discord.post(channel, { markdown: "x", actions }))
        assert.deepStrictEqual(discord.descriptor.limits.actionsPerMessage, 25)
        assert.strictEqual((yield* post(Array.from({ length: 26 }, (_, i) => button(i)))).detail, "too_many_actions")
        // Six selects need six rows.
        assert.strictEqual((yield* post(Array.from({ length: 6 }, () => select))).detail, "too_many_actions")
        // 99 code points of id and value fit, with the join, in Discord's 100.
        const astral = "\u{1D400}"
        assert.strictEqual(
          (yield* post([{ _tag: "Button", id: "id", label: "x", value: astral.repeat(98) }])).detail,
          "action_data_too_long"
        )
        assert.strictEqual(
          (yield* post([{ ...select, options: [{ label: "x", value: "x".repeat(96) }] }])).tag,
          "TooLarge"
        )
        assert.strictEqual(
          (yield* post([{ _tag: "Button", id: "a\u241Fb", label: "x" }])).tag,
          "InvalidRequest"
        )
        assert.strictEqual(fake.calls.length, 0)
      })
    )
  })

  it.effect("an id and value of 99 code points fit", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, {
          markdown: "x",
          actions: [{ _tag: "Button", id: "id", label: "x", value: "\u{1D400}".repeat(97) }]
        })
        assert.strictEqual(fake.called("createMessage").length, 1)
      })
    )
  })
})

describe("recorded components", () => {
  // fixtures/recorded/components.json: what Discord accepted and refused in #test.
  const call = (name: string) => step("components", name)
  const styles = ["default", "primary", "danger"] as const
  const sentRows = (actions: ReadonlyArray<ChatUi.Action>) => {
    const fake = makeFake({ createMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.post(channel, { markdown: "x", actions })
        return fake.called("createMessage")[0][1].components
      })
    )
  }
  const buttons = (from: number, to: number): Array<ChatUi.Action> =>
    Array.from(
      { length: to - from },
      (_, i) => ({ _tag: "Button", id: "b" + (from + i), label: "b" + (from + i), value: "v" + (from + i) })
    )
  const options = (n: number) => Array.from({ length: n }, (_, i) => ({ label: "o" + i, value: "o" + i }))

  it.effect("the rows the adapter builds are the rows Discord accepted", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<readonly [string, ReadonlyArray<ChatUi.Action>]> = [
        ["rows-25-buttons", [
          ...Array.from({ length: 24 }, (_, i): ChatUi.Action => ({
            _tag: "Button",
            id: "b" + i,
            label: "b" + i,
            value: "v" + i,
            style: styles[i % 3]
          })),
          { _tag: "LinkButton", label: "link", url: "https://effect.website" }
        ]],
        ["rows-selects-and-buttons", [
          ...buttons(0, 5),
          { _tag: "Select", id: "s1", options: options(25), selected: "o3" },
          ...buttons(5, 10),
          { _tag: "Select", id: "s2", options: options(2) },
          ...buttons(10, 15)
        ]],
        ["custom-id-100-ascii-with-join", [{ _tag: "Button", id: "a".repeat(98), label: "x", value: "b" }]],
        // 100 code points but 150 UTF-16 units: Discord counts code points.
        ["custom-id-100-code-points-astral", [{
          _tag: "Button",
          id: "a".repeat(49),
          label: "x",
          value: "\u{1F600}".repeat(50)
        }]]
      ]
      for (const [name, actions] of cases) {
        assert.strictEqual(call(name).status, 200)
        assert.deepStrictEqual(yield* sentRows(actions), call(name).request.components, name)
      }
    }))

  it.effect("what Discord refused, the adapter refuses before a call", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const post = (actions: ReadonlyArray<ChatUi.Action>) =>
          reason(discord.post(channel, { markdown: "x", actions }))
        const cases: ReadonlyArray<readonly [string, ReadonlyArray<ChatUi.Action>, string]> = [
          ["twenty-six-buttons", buttons(0, 26), "too_many_actions"],
          [
            "six-rows",
            Array.from({ length: 6 }, (_, i) => ({ _tag: "Select", id: "s" + i, options: options(2) })),
            "too_many_actions"
          ],
          [
            "custom-id-101-ascii",
            [{ _tag: "Button", id: "a".repeat(100), label: "x", value: "b" }],
            "action_data_too_long"
          ],
          ["custom-id-101-code-points-astral", [{
            _tag: "Button",
            id: "a".repeat(50),
            label: "x",
            value: "\u{1F600}".repeat(50)
          }], "action_data_too_long"]
        ]
        for (const [name, actions, detail] of cases) {
          assert.deepStrictEqual([call(name).status, call(name).response.code], [400, 50035], name)
          assert.deepStrictEqual(yield* post(actions), { op: "post", tag: "TooLarge", detail, retry: "denied" }, name)
        }
        assert.strictEqual(fake.calls.length, 0)
      })
    )
  })
})

describe("files", () => {
  const file = { name: "fixture.txt", contentType: "text/plain", content: new TextEncoder().encode("hello") }
  const refused = (fail: () => Effect.Effect<unknown, unknown>) => {
    const fake = makeFake({ createMessage: fail })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const error = yield* Effect.flip(discord.post(channel, { markdown: "x", files: [file] }))
        return { tag: error.reason._tag, detail: error.reason.detail, retry: error.retry, cause: error.reason.cause }
      })
    )
  }

  it.effect("a denied answer to a post with files is file_refused, with Discord's reason as the cause", () =>
    Effect.gen(function*() {
      for (const [status, code] of [[400, 40005], [400, 50045], [403, 50013]] as const) {
        const result = yield* refused(() => Effect.fail(errorResponse(status, { code, message: "refused" })))
        assert.strictEqual(result.detail, "file_refused")
        assert.strictEqual(result.retry, "denied")
        assert.strictEqual((result.cause as any).detail, String(code))
      }
      // Discord's own 413, as recorded in fixtures/recorded/uploads.json.
      const oversize = yield* refused(() => answer(step("uploads", "upload-20MiB-plus-1")))
      assert.deepStrictEqual([oversize.tag, oversize.detail, oversize.retry], ["TooLarge", "file_refused", "denied"])
      assert.strictEqual((oversize.cause as any).detail, "40005")
      // A 413 with no JSON body, as a proxy in between might send.
      const edge = yield* refused(() =>
        Effect.fail({ _tag: "HttpClientError", reason: { _tag: "DecodeError", response: { status: 413 } } })
      )
      assert.deepStrictEqual([edge.tag, edge.detail, edge.retry], ["TooLarge", "file_refused", "denied"])
      // A failure that is not denied keeps its own reason.
      const unavailable = yield* refused(() => Effect.fail(statusCodeError(502)))
      assert.deepStrictEqual([unavailable.tag, unavailable.detail], ["PlatformUnavailable", "http_502"])
    }))

  it.effect("the adapter's own count and size check is file_refused, without a call", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const tooMany = yield* reason(
          discord.post(channel, { markdown: "x", files: Array.from({ length: 11 }, () => file) })
        )
        const tooBig = yield* reason(discord.post(channel, {
          markdown: "x",
          files: [{ ...file, content: new Uint8Array(10 * 1024 * 1024 + 1) }]
        }))
        for (const result of [tooMany, tooBig]) {
          assert.deepStrictEqual(result, { op: "post", tag: "TooLarge", detail: "file_refused", retry: "denied" })
        }
        assert.strictEqual(fake.calls.length, 0)
        // The limit is a conservative bound, at most what Discord accepted (20 MiB in a guild with no
        // boosts), so files between the two are refused here although Discord would take them.
        const accepted = step("uploads", "upload-20MiB")
        assert.strictEqual(accepted.status, 200)
        assert.isAtMost(discord.descriptor.limits.uploadBytes, accepted.request["files[0]"].bytes)
      })
    )
  })
})

describe("edit", () => {
  it.effect("sends allowed_mentions and the SUPPRESS_EMBEDS flag on every edit", () => {
    const fake = makeFake({ updateMessage: () => Effect.succeed(posted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        yield* discord.edit(channel, "1", { markdown: "now with https://effect.website" })
        assert.deepStrictEqual(fake.called("updateMessage"), [[scratch, "1", {
          content: "now with https://effect.website",
          allowed_mentions: noMentions,
          flags: 4,
          components: []
        }]])
        assert.deepStrictEqual(yield* reason(discord.edit(channel, "1", { markdown: "a".repeat(2001) })), {
          op: "edit",
          tag: "TooLarge",
          detail: "message_too_long",
          retry: "denied"
        })
      })
    )
  })
})

describe("startThread", () => {
  it.effect("names the thread after the message, cut to 100 characters", () => {
    const fake = makeFake({
      getMessage: () => Effect.succeed({ ...posted, content: "  first line\nsecond " + "x".repeat(200) }),
      createThreadFromMessage: () => Effect.succeed(step("history", "thread-start").response)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* discord.startThread(channel, threadId).pipe(
          DiscordChat.withPostOptions({ autoArchiveDuration: 1440 })
        )
        assert.deepStrictEqual(result, thread)
        const [[channelId, messageId, body]] = fake.called("createThreadFromMessage")
        assert.strictEqual(channelId, scratch)
        assert.strictEqual(messageId, threadId)
        assert.strictEqual(body.name, ("first line second " + "x".repeat(200)).slice(0, 100))
        assert.strictEqual(body.auto_archive_duration, 1440)
      })
    )
  })

  it.effect("160004 gives the existing thread, whose id is the message's", () => {
    const fake = makeFake({ createThreadFromMessage: () => answer(step("errors", "thread-start-again")) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* discord.startThread(channel, threadId, { name: "given" })
        assert.deepStrictEqual(result, thread)
        assert.strictEqual(fake.called("createThreadFromMessage")[0][2].name, "given")
      })
    )
  })

  it.effect("on a message in a thread, gives the thread", () => {
    const fake = makeFake({
      createThreadFromMessage: () => answer(step("errors", "forum-start-thread-again")),
      getChannel: () => Effect.succeed(threadChannel)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.deepStrictEqual(yield* discord.startThread(thread, "1", { name: "x" }), thread)
      })
    )
  })

  it.effect("50024 elsewhere stays a failure", () => {
    const fake = makeFake({
      createThreadFromMessage: () => answer(step("errors", "forum-start-thread-again")),
      getChannel: () => Effect.succeed(step("channels", "get-channel-dm").response)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* reason(discord.startThread(channel, "1", { name: "x" }))
        assert.strictEqual(result.detail, "50024")
      })
    )
  })
})

describe("history", () => {
  const listFrom = (pages: ReadonlyArray<any>) => (_: string, options: any) => {
    const all = [...pages]
    const id = (raw: any) => BigInt(raw.id)
    const found = options.before !== undefined
      ? all.filter((raw) => id(raw) < BigInt(options.before))
      : options.after !== undefined
      ? all.filter((raw) => id(raw) > BigInt(options.after))
      : all
    // Newest first, as Discord answers with either bound.
    return Effect.succeed(found.sort((a, b) => (id(b) > id(a) ? 1 : -1)).slice(0, options.limit ?? 50))
  }

  it.effect("a thread started from a message has its opener first, addressed to the parent", () => {
    const fake = makeFake({ listMessages: listFrom(history.response) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const forward = Array.from(yield* Stream.runCollect(discord.history(thread, { direction: "forward" })))
        assert.deepStrictEqual(forward.map((message) => message.id), [
          threadId,
          ...history.response.filter((raw: any) => raw.type !== 21).map((raw: any) => raw.id).reverse()
        ])
        assert.deepStrictEqual(forward[0].thread, channel)
        for (const message of forward.slice(1)) assert.deepStrictEqual(message.thread, thread)
        for (const message of forward) yield* checkMessage(message, checkOptions)
        const backward = Array.from(yield* Stream.runCollect(discord.history(thread, { direction: "backward" })))
        assert.deepStrictEqual(backward.map((message) => message.id), forward.map((message) => message.id).reverse())
        // `from` is exclusive, the opener included.
        const after = Array.from(
          yield* Stream.runCollect(discord.history(thread, { direction: "forward", from: threadId }))
        )
        assert.deepStrictEqual(after.map((message) => message.id), forward.slice(1).map((message) => message.id))
        assert.strictEqual(fake.called("getMessage").length, 0)
      })
    )
  })

  it.effect("a thread whose opener was deleted starts at the first reply", () => {
    const deleted = step("history", "thread-deleted-history").response
    const fake = makeFake({ listMessages: listFrom(deleted) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const thread = DiscordChat.thread(step("history", "thread-deleted-start").response.id)
        const found = Array.from(yield* Stream.runCollect(discord.history(thread, { direction: "forward" })))
        assert.deepStrictEqual(found.map((message) => message.id), [deleted.find((raw: any) => raw.type === 0).id])
      })
    )
  })

  it.effect("the opener is read when the placeholder carries no referenced_message", () => {
    const placeholder = history.response.find((raw: any) => raw.type === 21)
    const { referenced_message: opener, ...bare } = placeholder
    const fake = makeFake({
      listMessages: listFrom([bare]),
      getMessage: (channelId: string, messageId: string) =>
        channelId === scratch && messageId === threadId
          ? Effect.succeed(opener)
          : Effect.fail(errorResponse(404, { code: 10008, message: "Unknown Message" }))
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const found = Array.from(yield* Stream.runCollect(discord.history(thread, { direction: "backward" })))
        assert.deepStrictEqual(found.map((message) => message.id), [threadId])
      })
    )
  })

  it.effect("pages until a short page", () => {
    const many = Array.from(
      { length: 250 },
      (_, i) => ({ ...posted, id: String(1570607253965246584n + BigInt(i + 1)) })
    )
    const fake = makeFake({ listMessages: listFrom(many) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const found = Array.from(yield* Stream.runCollect(discord.history(channel, { direction: "backward" })))
        assert.strictEqual(found.length, 250)
        assert.strictEqual(fake.called("listMessages").length, 3)
        assert.deepStrictEqual(fake.called("listMessages")[1][1], { before: found[99].id, limit: 100 })
      })
    )
  })
})

describe("opener", () => {
  it.effect("reads the message in the parent for a thread started from a message", () => {
    const fake = makeFake({
      getChannel: () => Effect.succeed(threadChannel),
      getMessage: (channelId: string) =>
        channelId === threadId
          ? answer(step("history", "thread-get-opener-by-thread-id"))
          : answer(step("history", "thread-get-opener"))
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const opener = Option.getOrThrow(yield* discord.opener(thread))
        assert.strictEqual(opener.id, threadId)
        assert.deepStrictEqual(opener.thread, channel)
        assert.deepStrictEqual(fake.called("getMessage"), [[threadId, threadId], [scratch, threadId]])
      })
    )
  })

  it.effect("reads a forum post's starter in the post", () => {
    const starter = step("history", "forum-get-starter").response
    const fake = makeFake({
      getChannel: () => Effect.succeed(step("history", "forum-post").response),
      getMessage: () => Effect.succeed(starter)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const opener = Option.getOrThrow(yield* discord.opener(DiscordChat.thread(starter.id)))
        assert.strictEqual(opener.thread.id, starter.id)
      })
    )
  })

  it.effect("is None for a deleted opener and for a channel", () => {
    const fake = makeFake({
      getChannel: (id: string) =>
        Effect.succeed(id === scratch ? step("channels", "get-channel-text").response : threadChannel),
      getMessage: () => answer(step("history", "thread-deleted-get-opener"))
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.isTrue(Option.isNone(yield* discord.opener(thread)))
        assert.isTrue(Option.isNone(yield* discord.opener(channel)))
      })
    )
  })
})

describe("an opener the bot can't read", () => {
  const forbidden = () => Effect.fail(errorResponse(403, { code: 50001, message: "Missing Access" }))

  it.effect("history skips it and starts at the first reply", () => {
    const placeholder = history.response.find((raw: any) => raw.type === 21)
    const { referenced_message: _, ...bare } = placeholder
    const reply = history.response.find((raw: any) => raw.type === 0)
    const fake = makeFake({ listMessages: () => Effect.succeed([reply, bare]), getMessage: forbidden })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const found = Array.from(yield* Stream.runCollect(discord.history(thread, { direction: "forward" })))
        assert.deepStrictEqual(found.map((message) => message.id), [reply.id])
      })
    )
  })

  it.effect("opener is None", () => {
    const fake = makeFake({ getChannel: () => Effect.succeed(threadChannel), getMessage: forbidden })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.isTrue(Option.isNone(yield* discord.opener(thread)))
        assert.strictEqual(fake.called("getMessage").length, 2)
      })
    )
  })

  it.effect("a forbidden thread still fails history and opener", () => {
    const fake = makeFake({ listMessages: forbidden, getChannel: forbidden })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        assert.strictEqual(
          (yield* reason(Stream.runCollect(discord.history(thread, { direction: "forward" })))).tag,
          "Forbidden"
        )
        assert.strictEqual((yield* reason(discord.opener(thread))).tag, "Forbidden")
      })
    )
  })
})

describe("invalid timestamps", () => {
  it.effect("a post answer with an invalid timestamp fails, as any unreadable write answer does", () => {
    const fake = makeFake({ createMessage: () => Effect.succeed({ ...posted, timestamp: "not a date" }) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const result = yield* reason(discord.post(channel, { markdown: "x" }))
        assert.strictEqual(result.tag, "Unknown")
        assert.strictEqual(result.detail, "invalid_timestamp")
      })
    )
  })
})

describe("getThread and getUser", () => {
  it.effect("getThread gives the kind, name and parent", () => {
    const fake = makeFake({
      getChannel: (id: string) =>
        Effect.succeed(
          id === threadId
            ? threadChannel
            : id === scratch
            ? step("channels", "get-channel-text").response
            : step("channels", "get-channel-dm").response
        )
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const info = yield* discord.getThread(thread)
        assert.strictEqual(info.kind, "thread")
        assert.strictEqual(info.name, "Fixture thread from a message")
        assert.deepStrictEqual(info.parent, channel)
        assert.isDefined(info.createdAt)
        const text = yield* discord.getThread(channel)
        assert.strictEqual(text.kind, "channel")
        assert.strictEqual(text.name, "effect-chat-scratch")
        assert.isUndefined(text.parent)
        const dm = yield* discord.getThread(DiscordChat.thread(step("channels", "get-channel-dm").response.id))
        assert.strictEqual(dm.kind, "direct")
        assert.isUndefined(dm.name)
      })
    )
  })

  it.effect("getUser gives the guild nick with in, and NotFound for a webhook", () => {
    const member = step("users", "get-member-bot").response
    const fake = makeFake({
      getChannel: () => Effect.succeed(step("channels", "get-channel-text").response),
      getGuildMember: () => Effect.succeed({ ...member, nick: "Janny" }),
      getUser: (id: string) =>
        id === botUserId ? answer(step("users", "get-user-bot")) : answer(step("errors", "get-user-webhook"))
    })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const inGuild = yield* discord.getUser(botUserId, { in: channel })
        assert.strictEqual(inGuild.name, "Janny")
        assert.isTrue(inGuild.isSelf && inGuild.isBot)
        assert.deepStrictEqual(fake.called("getGuildMember"), [[guild, botUserId]])
        const plain = yield* discord.getUser(botUserId)
        assert.strictEqual(plain.name, "Janitor")
        assert.strictEqual((yield* reason(discord.getUser("1570607260156297307"))).tag, "NotFound")
      })
    )
  })

  it.effect("guild reads the channel once", () => {
    const fake = makeFake({ getChannel: () => Effect.succeed(step("channels", "get-channel-text").response) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        assert.deepStrictEqual(yield* discord.guild(channel), Option.some(guild))
        assert.deepStrictEqual(yield* discord.guild(channel), Option.some(guild))
        assert.strictEqual(fake.called("getChannel").length, 1)
      })
    )
  })
})

describe("download", () => {
  it.effect("reads the message again for the URL and stops past maxBytes", () => {
    const raw = step("posts", "attachment-fixed").response
    const fake = makeFake({ getMessage: () => Effect.succeed(raw) })
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* adapter
        const event = yield* Effect.succeed(events("attachment")[0])
        const [attachment] = (DiscordChat.normalize(event, { botUserId }) as any).success[0].message.attachments
        const attachmentFromPost = { ...attachment, id: `${raw.id}/${raw.attachments[0].id}` }
        const bytes = yield* Stream.runCollect(discord.download(channel, attachmentFromPost, { maxBytes: 100 }))
        assert.strictEqual(new TextDecoder().decode(Array.from(bytes)[0]), "hello from effect/chat\n")
        const tooLarge = yield* reason(
          Stream.runCollect(discord.download(channel, attachmentFromPost, { maxBytes: 5 }))
        )
        assert.strictEqual(tooLarge.tag, "TooLarge")
      }),
      { download: new TextEncoder().encode("hello from effect/chat\n") }
    )
  })
})

describe("dispatch", () => {
  const collect = () => {
    const seen: Array<ChatEvent.ChatEvent> = []
    const handler = ChatHandler.of({ handle: (event) => Effect.sync(() => void seen.push(event)) })
    return { seen, provide: Effect.provideService(ChatHandler, handler) }
  }
  const missing = events("channel-message-without-channel-type")[0]

  it.effect("delivers a message with channel_type without a lookup", () => {
    const fake = makeFake({})
    const { provide, seen } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        yield* provide(discord.dispatch(events("channel-message")[0]))
        yield* provide(discord.dispatch({ t: "READY", d: {} }))
        yield* provide(discord.dispatch(events("thread-started")[0]))
        assert.strictEqual(seen.length, 1)
        assert.strictEqual(fake.calls.length, 0)
      })
    )
  })

  it.effect("looks the channel up once when channel_type is missing", () => {
    const fake = makeFake({ getChannel: () => Effect.succeed(threadChannel) })
    const { provide, seen } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        yield* provide(discord.dispatch(missing))
        yield* provide(discord.dispatch(missing))
        assert.strictEqual(seen.length, 2)
        assert(seen[0]._tag === "MessageCreated")
        assert.strictEqual(seen[0].kind, "thread")
        assert.deepStrictEqual(fake.called("getChannel"), [[scratch]])
      })
    )
  })

  it.effect("fails NotAccepted when the lookup fails, and tries again next time", () => {
    let attempts = 0
    const fake = makeFake({
      getChannel: () =>
        attempts++ < 4
          ? Effect.fail(statusCodeError(500))
          : Effect.succeed(step("channels", "get-channel-text").response)
    })
    const { provide, seen } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        const fiber = yield* Effect.forkChild(Effect.flip(provide(discord.dispatch(missing))))
        yield* TestClock.adjust("10 seconds")
        assert.instanceOf(yield* Fiber.join(fiber), NotAccepted)
        assert.strictEqual(seen.length, 0)
        yield* provide(discord.dispatch(missing))
        assert.strictEqual(seen.length, 1)
      })
    )
  })

  it.effect("drops the event when the lookup is denied", () => {
    const fake = makeFake({ getChannel: () => answer(step("errors", "get-channel-unknown")) })
    const { provide, seen } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        yield* provide(discord.dispatch(missing))
        assert.strictEqual(seen.length, 0)
      })
    )
  })

  it.effect("fails NotAccepted when the lookup takes longer than five seconds", () => {
    const fake = makeFake({ getChannel: () => Effect.never })
    const { provide } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        const fiber = yield* Effect.forkChild(Effect.flip(provide(discord.dispatch(missing))))
        yield* TestClock.adjust("5 seconds")
        assert.instanceOf(yield* Fiber.join(fiber), NotAccepted)
      })
    )
  })

  it.effect("delivers Tim's recorded mention after looking the channel up", () => {
    // Derived dispatch: a REST body, which carries no channel_type.
    const raw = step("human", "human-mention-get-message").response
    const fake = makeFake({ getChannel: () => answer(step("human", "human-mention-get-channel")) })
    const { provide, seen } = collect()
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        yield* provide(discord.dispatch({ t: "MESSAGE_CREATE", d: raw }))
        assert.strictEqual(seen.length, 1)
        const event = seen[0]
        assert(event._tag === "MessageCreated")
        assert.strictEqual(event.kind, "channel")
        assert.isFalse(event.message.author.isBot)
        assert.deepStrictEqual(event.message.mentions.map((mention) => mention.id), [botUserId])
        assert.deepStrictEqual(fake.called("getChannel"), [[raw.channel_id]])
      })
    )
  })

  it.effect("passes the handler's NotAccepted on", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const discord = yield* DiscordChat.DiscordChat
        const error = yield* Effect.flip(
          discord.dispatch(events("channel-message")[0]).pipe(
            Effect.provideService(ChatHandler, ChatHandler.of({ handle: () => Effect.fail(new NotAccepted()) }))
          )
        )
        assert.instanceOf(error, NotAccepted)
      })
    )
  })
})
