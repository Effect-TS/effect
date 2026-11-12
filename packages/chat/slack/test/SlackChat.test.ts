import * as SlackChat from "@effect/chat-slack/SlackChat"
import { SlackWebApi } from "@effect/chat-slack/SlackWebApi"
import { assert, describe, it } from "@effect/vitest"
import { checkMessage } from "effect/chat/ChatTest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import { adapter, authTest, botUserId, channel, checkOptions, fixture, makeFake, slackLayer, team } from "./utils.ts"

const root = "1794509110.999799"
const channelThread = SlackChat.thread({ team, channel })
const replyThread = SlackChat.thread({ team, channel, threadTs: root })

const run = <A, E>(
  fake: ReturnType<typeof makeFake>,
  effect: Effect.Effect<A, E, any>
) => effect.pipe(Effect.provide(slackLayer(fake))) as Effect.Effect<A, E>

const posted = (ts: string) => ({ ok: true, channel, ts })

const reason = <A>(effect: Effect.Effect<A, any>) =>
  Effect.flip(effect).pipe(
    Effect.map((error) => ({ op: error.op, tag: error.reason._tag, detail: error.reason.detail, retry: error.retry }))
  )

describe("post", () => {
  it.effect("sends escaped markdown_text with unfurls off", () => {
    const fake = makeFake({ "chat.postMessage": posted("1794509200.000100") })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const result = yield* slack.post(replyThread, { markdown: "hi <@U1> `<@U1>`" })
        assert.strictEqual(result.id, "1794509200.000100")
        assert.deepStrictEqual(result.thread, replyThread)
        assert.deepStrictEqual(fake.called("chat.postMessage")[0].params, {
          channel,
          thread_ts: root,
          markdown_text: "hi &lt;@U1> `<@U1>`",
          unfurl_links: "false",
          unfurl_media: "false"
        })
      })
    )
  })

  it.effect("withPostOptions allows a token and turns unfurls on", () => {
    const fake = makeFake({ "chat.postMessage": posted("1794509200.000101") })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.post(channelThread, { markdown: "hi <@U1> <@U2>" }).pipe(
          SlackChat.withPostOptions({ notify: { users: ["U1"] } }),
          SlackChat.withPostOptions({ unfurl: true })
        )
        const params = fake.called("chat.postMessage")[0].params
        assert.strictEqual(params.markdown_text, "hi <@U1> &lt;@U2>")
        assert.strictEqual(params.unfurl_links, "true")
        assert.strictEqual(params.unfurl_media, "true")
        assert.isUndefined(params.thread_ts)
      })
    )
  })

  it.effect("fails TooLarge before calling Slack", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const cases = [
          "a".repeat(12_001),
          // 3,001 `<` are 12,004 once escaped.
          "<".repeat(3_001)
        ]
        for (const markdown of cases) {
          const failure = yield* reason(slack.post(channelThread, { markdown }))
          assert.strictEqual(failure.tag, "TooLarge")
        }
        assert.strictEqual(fake.calls.length, 0)
        // 12,000 astral letters fit.
        assert.strictEqual(slack.descriptor.measure("𝐀".repeat(12_000)), 12_000)
      })
    )
  })

  it.effect("leaves the emoji count to Slack", () => {
    const fake = makeFake({
      "chat.postMessage": [posted("1794509200.000100"), { ok: false, error: "msg_blocks_too_long" }]
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        // 14,000 if `&lt;` cost 4, 11,000 as Slack counts it.
        const markdown = "😀".repeat(1_000) + "<".repeat(1_000)
        assert.isAtMost(slack.descriptor.measure(markdown), slack.descriptor.limits.messageLength)
        yield* slack.post(channelThread, { markdown })
        // 1,400 😀 are 14,000 with shortcodes: Slack refuses, nothing is posted.
        const failure = yield* reason(slack.post(channelThread, { markdown: "😀".repeat(1_400) }))
        assert.deepStrictEqual(failure, { op: "post", tag: "TooLarge", detail: "msg_blocks_too_long", retry: "denied" })
        assert.strictEqual(fake.called("chat.postMessage").length, 2)
      })
    )
  })

  it.effect("edit skips the emoji limit", () => {
    const fake = makeFake({ "chat.update": { ok: true } })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.edit(channelThread, "1794509200.000100", { markdown: "😀".repeat(1_400) })
        assert.strictEqual(fake.called("chat.update")[0].params.ts, "1794509200.000100")
        assert.isUndefined(fake.called("chat.update")[0].params.unfurl_links)
      })
    )
  })

  it.effect("replyTo is unsupported", () =>
    run(
      makeFake({}),
      Effect.gen(function*() {
        const slack = yield* adapter
        const failure = yield* reason(slack.post(channelThread, { markdown: "x", replyTo: { messageId: "1.2" } }))
        assert.strictEqual(failure.tag, "Unsupported")
        assert.isFalse(slack.descriptor.capabilities.has("replyTo"))
      })
    ))

  it.effect("files go up and are shared as one message", () => {
    const fake = makeFake({
      "files.getUploadURLExternal": { ok: true, upload_url: "https://files.slack.test/upload/1", file_id: "F1" },
      "files.completeUploadExternal": { ok: true, files: [{ id: "F1" }] },
      "files.info": [
        { ok: true, file: { id: "F1", shares: {} } },
        {
          ok: true,
          file: { id: "F1", shares: { private: { [channel]: [{ ts: "1794509300.000100", thread_ts: root }] } } }
        }
      ]
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const result = yield* slack.post(replyThread, {
          markdown: "**see** <@U1>",
          files: [{ name: "a.txt", contentType: "text/plain", content: new TextEncoder().encode("hello") }]
        }).pipe(Effect.forkChild)
        yield* TestClock.adjust("1 second")
        const value = yield* Fiber.join(result)
        assert.strictEqual(value.id, "1794509300.000100")
        const complete = fake.called("files.completeUploadExternal")[0].params
        assert.strictEqual(complete.initial_comment, "*see* &lt;@U1&gt;")
        assert.strictEqual(complete.thread_ts, root)
        assert.deepStrictEqual(JSON.parse(complete.files), [{ id: "F1", title: "a.txt" }])
        assert.strictEqual(fake.called("/upload/1").length, 1)
      })
    )
  })
})

describe("files", () => {
  const upload = {
    "files.getUploadURLExternal": { ok: true, upload_url: "https://files.slack.test/upload/1", file_id: "F1" },
    "files.completeUploadExternal": { ok: true, files: [{ id: "F1" }] }
  }
  const file = { name: "a.txt", contentType: "text/plain", content: new TextEncoder().encode("hello") }

  it.effect("a refused read after the share is an uncertain post, not a refusal", () => {
    const fake = makeFake({ ...upload, "files.info": { ok: false, error: "missing_scope" } })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const failure = yield* reason(slack.post(replyThread, { markdown: "see", files: [file] }))
        assert.deepStrictEqual(failure, { op: "post", tag: "Unknown", detail: "share_ts_unknown", retry: "uncertain" })
        assert.strictEqual(fake.called("files.info").length, 1)
      })
    )
  })

  it.effect("a failing read after the share is polled again, then uncertain", () => {
    const fake = makeFake({ ...upload, "files.info": { status: 500 } })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const result = yield* Effect.forkChild(reason(slack.post(replyThread, { markdown: "see", files: [file] })))
        yield* TestClock.adjust("10 minutes")
        const failure = yield* Fiber.join(result)
        assert.strictEqual(failure.tag, "Unknown")
        assert.strictEqual(failure.retry, "uncertain")
        assert.isAbove(fake.called("files.info").length, 1)
      })
    )
  })
})

describe("errors", () => {
  it.effect("maps Slack's codes", () => {
    const fake = makeFake({
      "auth.test": authTest,
      "chat.update": { ok: false, error: "invalid_auth" },
      "conversations.replies": { ok: false, error: "thread_not_found" },
      "chat.postMessage": { status: 500 },
      "conversations.info": { status: 429, headers: { "retry-after": "7" } },
      "users.info": { ok: false, error: "user_not_found" }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        assert.deepStrictEqual(yield* reason(slack.edit(channelThread, "1.2", { markdown: "x" })), {
          op: "edit",
          tag: "Unauthenticated",
          detail: "invalid_auth",
          retry: "denied"
        })
        assert.deepStrictEqual(yield* reason(slack.fetchMessage(channelThread, "1.2")), {
          op: "fetchMessage",
          tag: "NotFound",
          detail: "thread_not_found",
          retry: "denied"
        })
        // A write that may have landed is never repeated.
        assert.deepStrictEqual(yield* reason(slack.post(channelThread, { markdown: "x" })), {
          op: "post",
          tag: "PlatformUnavailable",
          detail: "http_500",
          retry: "uncertain"
        })
        assert.strictEqual(fake.called("chat.postMessage").length, 1)
        const api = yield* SlackWebApi
        const limited = yield* Effect.flip(api.call("conversations.info", { channel }, { retry: false }))
        assert.strictEqual(limited.reason._tag, "RateLimited")
        assert.deepStrictEqual(limited.retryAfter, Duration.seconds(7))
        // A bot_message author is a bot id, which users.info does not know.
        assert.strictEqual((yield* reason(slack.getUser("B0WEBHOOK"))).tag, "NotFound")
      })
    )
  })
})

describe("reads", () => {
  const mentions = fixture("markdown-mentions")
  const replies = mentions.calls.find((call) => call.method === "conversations.replies")!.response

  it.effect("fetchMessage normalises what Slack stored", () => {
    const fake = makeFake({ "auth.test": authTest, "conversations.replies": replies })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const message = yield* slack.fetchMessage(channelThread, "1794509003.143939")
        yield* checkMessage(message, checkOptions)
        assert.deepStrictEqual(message.thread, channelThread)
        assert.strictEqual(message.mentions.length, 2)
        assert.deepStrictEqual(fake.called("conversations.replies")[0].params, {
          channel,
          ts: "1794509003.143939",
          latest: "1794509003.143939",
          oldest: "1794509003.143939",
          inclusive: "true",
          limit: "2"
        })
      })
    )
  })

  it.effect("opener is None for a channel, and for a root that is not a message", () => {
    const fake = makeFake({
      "auth.test": authTest,
      "conversations.replies": {
        ok: true,
        messages: [{ ts: root, thread_ts: root, subtype: "assistant_app_thread", user: botUserId, text: "New chat" }]
      }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        assert.isTrue(Option.isNone(yield* slack.opener(channelThread)))
        assert.isTrue(Option.isNone(yield* slack.opener(replyThread)))
        assert.strictEqual(fake.calls.filter((call) => call.method === "conversations.replies").length, 1)
      })
    )
  })

  it.effect("thread history in both directions, from exclusive", () => {
    const message = (ts: string) => ({ ts, thread_ts: root, user: "U080YLYB277", text: ts })
    const fake = makeFake({
      "auth.test": authTest,
      "conversations.replies": [
        {
          ok: true,
          messages: [message(root), message("1794509111.000001")],
          response_metadata: { next_cursor: "page2" }
        },
        { ok: true, messages: [message(root), message("1794509112.000001"), message("1794509113.000001")] }
      ]
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const forward = yield* Stream.runCollect(slack.history(replyThread, { direction: "forward" }))
        assert.deepStrictEqual(forward.map((m) => m.id), [
          root,
          "1794509111.000001",
          "1794509112.000001",
          "1794509113.000001"
        ])
        assert.deepStrictEqual(forward[0].thread, channelThread)
        assert.deepStrictEqual(fake.called("conversations.replies")[1].params.cursor, "page2")
        const backward = yield* Stream.runCollect(
          slack.history(replyThread, { direction: "backward", from: "1794509113.000001" })
        )
        assert.deepStrictEqual(backward.map((m) => m.id), ["1794509112.000001", root])
      })
    )
  })

  it.effect("getThread", () => {
    const fake = makeFake({
      "conversations.info": {
        ok: true,
        channel: { id: channel, name: "chat-testing-123", created: 1794400000, topic: { value: "tests" } }
      }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const info = yield* slack.getThread(channelThread)
        assert.strictEqual(info.kind, "channel")
        assert.strictEqual(info.name, "chat-testing-123")
        assert.strictEqual(info.topic, "tests")
        const thread = yield* slack.getThread(replyThread)
        assert.strictEqual(thread.kind, "thread")
        assert.deepStrictEqual(thread.parent, channelThread)
        assert.deepStrictEqual(yield* slack.startThread(channelThread, root), replyThread)
      })
    )
  })
})

describe("delete", () => {
  it.effect("stops an open stream first", () => {
    const fake = makeFake({
      "chat.delete": [{ ok: false, error: "cant_delete_message" }, { ok: true }],
      "chat.stopStream": { ok: true }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.delete(replyThread, "1794509111.134189")
        assert.deepStrictEqual(fake.calls.map((call) => call.method), ["chat.delete", "chat.stopStream", "chat.delete"])
      })
    )
  })
})

describe("nativeStream", () => {
  const ts = "1794509111.134189"

  it.effect("start, append with a held tail, stop", () => {
    const fake = makeFake({
      "chat.startStream": posted(ts),
      "chat.appendStream": posted(ts),
      "chat.stopStream": posted(ts)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const native = slack.nativeStream!
        const started = yield* native.start(replyThread, { markdown: "Hello ", recipient: "U080YLYB277" })
        assert.strictEqual(started.id, ts)
        assert.deepStrictEqual(fake.called("chat.startStream")[0].params, {
          channel,
          thread_ts: root,
          recipient_user_id: "U080YLYB277",
          recipient_team_id: team,
          markdown_text: "Hello "
        })
        const notify = SlackChat.withPostOptions({ notify: { users: ["U1"] } })
        assert.deepStrictEqual(yield* native.append(replyThread, ts, "hi <@U", undefined).pipe(notify), {
          state: "open",
          held: 3
        })
        assert.deepStrictEqual(yield* native.append(replyThread, ts, "<@U1> a < b", { flush: true }).pipe(notify), {
          state: "open",
          held: 0
        })
        assert.deepStrictEqual(
          fake.called("chat.appendStream").map((call) => call.params.markdown_text),
          ["hi ", "<@U1> a &lt; b"]
        )
        assert.deepStrictEqual(yield* native.stop(replyThread, ts, { end: "done" }), { stopped: false })
        assert.isUndefined(fake.called("chat.stopStream")[0].params.session_status)
        assert.strictEqual(fake.called("agents.sessions.setStatus").length, 0)
      })
    )
  })

  it.effect("is unsupported off a thread, without a recipient, or when turned off", () =>
    run(
      makeFake({}),
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        const cases = [
          native.start(channelThread, { markdown: "x", recipient: "U1" }),
          native.start(replyThread, { markdown: "x" }),
          native.start(replyThread, { markdown: "x", recipient: "U1" }).pipe(
            SlackChat.withPostOptions({ nativeStream: false })
          )
        ]
        for (const start of cases) assert.strictEqual((yield* reason(start)).tag, "Unsupported")
      })
    ))

  it.effect("closed, too large and stopped", () => {
    const fake = makeFake({
      "chat.startStream": posted(ts),
      "chat.appendStream": [
        { ok: false, error: "message_not_in_streaming_state" },
        { ok: false, error: "stopped_by_user" }
      ],
      "chat.stopStream": { ok: true, channel, ts, message: { ts, ai_context: { result_status: "stopped_by_user" } } },
      "agents.sessions.setStatus": { ok: true }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        yield* native.start(replyThread, { markdown: "a".repeat(11_990), recipient: "U1" })
        assert.strictEqual(
          (yield* reason(native.append(replyThread, ts, "b".repeat(11), { flush: true }))).tag,
          "TooLarge"
        )
        assert.strictEqual(fake.called("chat.appendStream").length, 0)
        assert.deepStrictEqual(yield* native.append(replyThread, ts, "c", { flush: true }), {
          state: "closed",
          held: 0
        })
        assert.deepStrictEqual(yield* native.append(replyThread, ts, "d", { flush: true }), {
          state: "stopped",
          held: 0
        })
        const result = yield* native.stop(replyThread, ts, { end: "done" }).pipe(
          SlackChat.withPostOptions({ sessionStatusAtEnd: "suspended" })
        )
        assert.deepStrictEqual(result, { stopped: true })
        assert.strictEqual(fake.called("chat.stopStream")[0].params.session_status, "suspended")
        assert.deepStrictEqual(fake.called("agents.sessions.setStatus")[0].params, {
          channel_id: channel,
          thread_ts: root,
          status: "suspended"
        })
      })
    )
  })

  it.effect("rotates with processing, and stops asking once Slack says not_authorized", () => {
    const fake = makeFake({
      "chat.stopStream": (params) =>
        params.session_status !== undefined
          ? { ok: false, error: "not_authorized" }
          : { ok: true, message: { ts, ai_context: { result_status: "stopped_by_user" } } },
      "agents.sessions.setStatus": { ok: false, error: "not_authorized" }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        assert.deepStrictEqual(yield* native.stop(replyThread, ts, { end: "rotating" }), { stopped: true })
        assert.deepStrictEqual(
          fake.called("chat.stopStream").map((call) => call.params.session_status),
          ["processing", undefined]
        )
        // Not a declared agent: no more session status, and a reply never fails over it.
        assert.deepStrictEqual(yield* native.stop(replyThread, ts, { end: "done" }), { stopped: true })
        assert.strictEqual(fake.called("chat.stopStream").length, 3)
        assert.isUndefined(fake.called("chat.stopStream")[2].params.session_status)
        assert.strictEqual(fake.called("agents.sessions.setStatus").length, 0)
      })
    )
  })

  it.effect("a 429 waits the retry-after, then doubles the interval for that message", () => {
    const fake = makeFake({
      "chat.appendStream": [{ status: 429, headers: { "retry-after": "3" } }, posted(ts)],
      "chat.update": posted("1794509200.000100")
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const native = slack.nativeStream!
        const limited = yield* reason(native.append(replyThread, ts, "a", { flush: true }))
        assert.strictEqual(limited.tag, "RateLimited")
        const appends = () => fake.called("chat.appendStream").length
        const second = yield* Effect.forkChild(native.append(replyThread, ts, "b", { flush: true }))
        yield* TestClock.adjust("2999 millis")
        assert.strictEqual(appends(), 1)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(second)
        assert.strictEqual(appends(), 2)
        // Two seconds now, twice the one second interval.
        const third = yield* Effect.forkChild(native.append(replyThread, ts, "c", { flush: true }))
        yield* TestClock.adjust("1999 millis")
        assert.strictEqual(appends(), 2)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(third)
        assert.strictEqual(appends(), 3)
        // Another message is not slowed.
        yield* slack.edit(replyThread, "1794509200.000100", { markdown: "x" })
        assert.strictEqual(fake.called("chat.update").length, 1)
      })
    )
  })

  it.effect("the doubled interval outlives a rotation of the reply", () => {
    const next = "1794509201.000100"
    const fake = makeFake({
      "chat.appendStream": [{ status: 429, headers: { "retry-after": "3" } }, posted(ts), posted(next)],
      "chat.stopStream": { ok: true, message: { ts } },
      "chat.startStream": posted(next)
    })
    return run(
      fake,
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        assert.strictEqual((yield* reason(native.append(replyThread, ts, "a", { flush: true }))).tag, "RateLimited")
        yield* native.stop(replyThread, ts, { end: "rotating" })
        // The next part's start waits for the retry-after.
        const start = yield* Effect.forkChild(native.start(replyThread, { markdown: "b", recipient: "U080YLYB277" }))
        yield* TestClock.adjust("2999 millis")
        assert.strictEqual(fake.called("chat.startStream").length, 0)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(start)
        // Its appends keep the doubled interval, two seconds.
        const append = yield* Effect.forkChild(native.append(replyThread, next, "c", { flush: true }))
        yield* TestClock.adjust("1999 millis")
        assert.strictEqual(fake.called("chat.appendStream").length, 1)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(append)
        assert.strictEqual(fake.called("chat.appendStream").length, 2)
        // A reply that ends hands nothing on.
        yield* native.stop(replyThread, next, { end: "done" })
        yield* native.start(replyThread, { markdown: "d", recipient: "U080YLYB277" })
        assert.strictEqual(fake.called("chat.startStream").length, 2)
      })
    )
  })

  it.effect("edits to one message are three seconds apart", () => {
    const other = "1794509200.000200"
    const fake = makeFake({ "chat.update": { ok: true } })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.edit(replyThread, ts, { markdown: "a" })
        const second = yield* Effect.forkChild(slack.edit(replyThread, ts, { markdown: "ab" }))
        // Another message is not held back.
        yield* slack.edit(replyThread, other, { markdown: "x" })
        yield* TestClock.adjust("2999 millis")
        assert.strictEqual(fake.called("chat.update").length, 2)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(second)
        assert.strictEqual(fake.called("chat.update").length, 3)
      })
    )
  })

  it.effect("stop on a closed stream succeeds", () => {
    const fake = makeFake({ "chat.stopStream": { ok: false, error: "message_not_in_streaming_state" } })
    return run(
      fake,
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        assert.deepStrictEqual(yield* native.stop(replyThread, ts, { end: "done" }), { stopped: false })
      })
    )
  })
})

describe("SlackChat", () => {
  it.effect("botUserId and user", () => {
    const fake = makeFake({
      "auth.test": authTest,
      "users.info": {
        ok: true,
        user: {
          id: "U0EXT",
          team_id: "T0OTHER",
          name: "ext",
          is_restricted: true,
          is_stranger: true,
          profile: { display_name: "Ext" }
        }
      }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* SlackChat.SlackChat
        assert.strictEqual(yield* slack.botUserId, botUserId)
        assert.strictEqual(yield* slack.botUserId, botUserId)
        assert.strictEqual(fake.called("auth.test").length, 1)
        const user = yield* slack.user("U0EXT")
        assert.include(user, { id: "U0EXT", teamId: "T0OTHER", name: "Ext", isRestricted: true, isStranger: true })
      })
    )
  })

  it("emoji in both directions", () => {
    assert.deepStrictEqual(SlackChat.emojiFromName(":+1::skin-tone-3:"), Option.some("👍🏼"))
    assert.deepStrictEqual(SlackChat.emojiToName("👍"), Option.some("+1"))
    assert.deepStrictEqual(SlackChat.emojiToName("❤"), Option.some("heart"))
    assert.isTrue(Option.isNone(SlackChat.emojiFromName("party-parrot")))
  })

  it("thread and parts", () => {
    assert.deepStrictEqual(SlackChat.parts(replyThread), Option.some({ team, channel, threadTs: root }))
    assert.deepStrictEqual(SlackChat.parts(channelThread), Option.some({ team, channel }))
    assert.isTrue(Option.isNone(SlackChat.parts({ platform: "discord", id: "1/2" })))
    assert.isTrue(Option.isNone(SlackChat.parts({ platform: "slack", id: "T1" })))
  })
})
