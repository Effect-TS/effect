import * as SlackChat from "@effect/chat-slack/SlackChat"
import { SlackWebApi } from "@effect/chat-slack/SlackWebApi"
import { assert, describe, it } from "@effect/vitest"
import { type ChatErrorReason, fileRefused } from "effect/chat/ChatError"
import { checkMessage, conformance } from "effect/chat/ChatTest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import {
  adapter,
  authTest,
  botUserId,
  channel,
  checkOptions,
  fixture,
  hang,
  makeFake,
  slackLayer,
  team
} from "./utils.ts"

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
  it.effect("sends a markdown block and an escaped text, with unfurls off", () => {
    const fake = makeFake({ "chat.postMessage": posted("1794509200.000100") })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const result = yield* slack.post(replyThread, { markdown: "hi <@U1> `<@U1>` & >" })
        assert.strictEqual(result.id, "1794509200.000100")
        assert.deepStrictEqual(result.thread, replyThread)
        assert.deepStrictEqual(fake.called("chat.postMessage")[0].params, {
          channel,
          thread_ts: root,
          blocks: JSON.stringify([{ type: "markdown", text: "hi &lt;@U1> `<@U1>` & >" }]),
          text: "hi &lt;@U1&gt; `&lt;@U1&gt;` &amp; &gt;",
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
        assert.deepStrictEqual(JSON.parse(params.blocks), [{ type: "markdown", text: "hi <@U1> &lt;@U2>" }])
        assert.strictEqual(params.text, "hi <@U1> &lt;@U2&gt;")
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

  it.effect("never sends an empty text: a post or edit with no Markdown fails before the call", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        assert.deepStrictEqual(yield* reason(slack.post(channelThread, { markdown: "" })), {
          op: "post",
          tag: "InvalidRequest",
          detail: "no_text",
          retry: "denied"
        })
        assert.strictEqual((yield* reason(slack.edit(channelThread, "1.2", { markdown: "" }))).detail, "no_text")
        assert.strictEqual(fake.calls.length, 0)
      })
    )
  })

  it.effect("an edit's text is cut to 3,800 bytes and keeps its allowed tokens", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.edit(channelThread, "1.2", { markdown: "<@U1> " + "é".repeat(5_000) + " <@U2>" }).pipe(
          SlackChat.withPostOptions({ notify: { users: ["U1", "U2"] } })
        )
        const params = fake.called("chat.update")[0].params
        assert.strictEqual(JSON.parse(params.blocks)[0].text, "<@U1> " + "é".repeat(5_000) + " <@U2>")
        assert.isTrue(params.text.startsWith("<@U1> éé"))
        assert.isTrue(params.text.endsWith("é… <@U2>"))
        assert.isAtMost(new TextEncoder().encode(params.text).length, 3_800)
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
})

describe("buttons and selects", () => {
  const button = { _tag: "Button", id: "go", label: "Go" } as const
  const select = { _tag: "Select", id: "pick", options: [{ label: "A", value: "a" }] } as const

  it.effect("are refused with Unsupported until the adapter supports them, calling nothing", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const post = yield* reason(slack.post(channelThread, { markdown: "x", actions: [button] }))
        assert.deepStrictEqual([post.op, post.tag], ["post", "Unsupported"])
        const edit = yield* reason(slack.edit(channelThread, "1.2", { markdown: "x", actions: [select] }))
        assert.deepStrictEqual([edit.op, edit.tag], ["edit", "Unsupported"])
        assert.strictEqual(fake.called("chat.postMessage").length + fake.called("chat.update").length, 0)
      })
    )
  })

  it.effect("pass unsupported/buttons and unsupported/selects over the stub", () => {
    const rules = conformance({
      platform: "slack",
      thread: channelThread,
      userPosts: () => Effect.die("unused"),
      parseMention: SlackChat.parseMention
    })
    return run(
      makeFake({ "auth.test": authTest }),
      Effect.andThen(rules["unsupported/buttons"], rules["unsupported/selects"])
    )
  })
})

describe("files", () => {
  const upload = (ids: ReadonlyArray<string>) => {
    let next = 0
    return {
      "files.getUploadURLExternal": () => {
        const id = ids[next++]
        return { ok: true, upload_url: `https://files.slack.test/upload/${id}`, file_id: id }
      },
      "files.completeUploadExternal": { ok: true, files: ids.map((id) => ({ id })) }
    }
  }
  const file = (name: string) => ({ name, contentType: "text/plain", content: new TextEncoder().encode("hello") })
  const ts = "1794509300.000100"
  const methods = (fake: ReturnType<typeof makeFake>) =>
    fake.calls.map((call) => call.method).filter((method) => !method.startsWith("/upload/"))

  it.effect("uploads, completes with no channel, posts, then attaches with the same body", () => {
    const fake = makeFake({ ...upload(["F1", "F2"]), "chat.postMessage": posted(ts) })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const markdown = "**see** <@U1> " + "a".repeat(5_000)
        const result = yield* slack.post(replyThread, { markdown, files: [file("a.txt"), file("b.txt")] })
        assert.strictEqual(result.id, ts)
        assert.deepStrictEqual(methods(fake), [
          "files.getUploadURLExternal",
          "files.getUploadURLExternal",
          "files.completeUploadExternal",
          "chat.postMessage",
          "chat.update"
        ])
        assert.deepStrictEqual(fake.called("files.completeUploadExternal")[0].params, {
          files: JSON.stringify([{ id: "F1", title: "a.txt" }, { id: "F2", title: "b.txt" }])
        })
        const post = fake.called("chat.postMessage")[0].params
        const attach = fake.called("chat.update")[0].params
        assert.deepStrictEqual(attach, {
          channel,
          ts,
          blocks: post.blocks,
          text: post.text,
          file_ids: JSON.stringify(["F1", "F2"])
        })
        // The text is cut to the update budget from the post on.
        assert.isAtMost(new TextEncoder().encode(post.text).length, 3_800)
        assert.isTrue(post.text.endsWith("…"))
        assert.strictEqual(post.thread_ts, root)

        // Later writes keep the files: no file_ids, and no files.delete.
        const edit = yield* Effect.forkChild(slack.edit(replyThread, ts, { markdown: "edited" }))
        yield* TestClock.adjust("3 seconds")
        yield* Fiber.join(edit)
        yield* slack.delete(replyThread, ts)
        assert.isUndefined(fake.called("chat.update")[1].params.file_ids)
        assert.strictEqual(fake.called("files.delete").length, 0)
      })
    )
  })

  it.effect("a post with files and no Markdown carries the escaped file names", () => {
    const fake = makeFake({ ...upload(["F1", "F2"]), "chat.postMessage": posted(ts) })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        yield* slack.post(channelThread, { markdown: "", files: [file("*a*.txt"), file("<@U1>.csv")] })
        const post = fake.called("chat.postMessage")[0].params
        assert.deepStrictEqual(JSON.parse(post.blocks), [{ type: "markdown", text: "\\*a\\*.txt, &lt;@U1>.csv" }])
        assert.strictEqual(post.text, "*a*.txt, &lt;@U1&gt;.csv")
        assert.strictEqual(fake.called("chat.update")[0].params.text, post.text)
      })
    )
  })

  it.effect("too many files fail file_refused before any call", () => {
    const fake = makeFake({})
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const files = Array.from({ length: slack.descriptor.limits.filesPerMessage + 1 }, (_, i) => file(`${i}.txt`))
        assert.deepStrictEqual(yield* reason(slack.post(channelThread, { markdown: "x", files })), {
          op: "post",
          tag: "TooLarge",
          detail: fileRefused,
          retry: "denied"
        })
        assert.deepStrictEqual(fake.calls, [])
      })
    )
  })

  it.effect("a file refused at the complete call posts nothing", () => {
    const fake = makeFake({
      ...upload(["F1"]),
      "files.completeUploadExternal": { ok: false, error: "invalid_arguments" }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const error = yield* Effect.flip(slack.post(channelThread, { markdown: "x", files: [file("a.txt")] }))
        assert.strictEqual(error.reason._tag, "InvalidRequest")
        assert.strictEqual(error.reason.detail, fileRefused)
        assert.strictEqual(error.retry, "denied")
        // Slack's code stays on the cause.
        assert.strictEqual((error.reason.cause as ChatErrorReason).detail, "invalid_arguments")
        assert.strictEqual(fake.called("chat.postMessage").length, 0)
      })
    )
  })

  it.effect("a failed post removes the uploads", () => {
    const fake = makeFake({ ...upload(["F1", "F2"]), "chat.postMessage": { ok: false, error: "not_in_channel" } })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const failure = yield* reason(slack.post(channelThread, { markdown: "x", files: [file("a"), file("b")] }))
        assert.deepStrictEqual(failure, { op: "post", tag: "Forbidden", detail: "not_in_channel", retry: "denied" })
        assert.deepStrictEqual(fake.called("files.delete").map((call) => call.params.file), ["F1", "F2"])
        assert.strictEqual(fake.called("chat.update").length, 0)
      })
    )
  })

  it.effect("an attach that times out is retried", () => {
    const fake = makeFake({ ...upload(["F1"]), "chat.postMessage": posted(ts), "chat.update": [hang, { ok: true }] })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const fiber = yield* Effect.forkChild(slack.post(channelThread, { markdown: "x", files: [file("a")] }))
        yield* TestClock.adjust("31 seconds")
        assert.strictEqual((yield* Fiber.join(fiber)).id, ts)
        assert.strictEqual(fake.called("chat.update").length, 2)
        assert.strictEqual(fake.called("chat.delete").length, 0)
      })
    )
  })

  it.effect("a long Retry-After on the attach is cut off by its deadline and rolled back, even when interrupted", () => {
    const fake = makeFake({
      ...upload(["F1"]),
      "chat.postMessage": posted(ts),
      "chat.update": { status: 429, headers: { "retry-after": "3600" } }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const fiber = yield* Effect.forkChild(slack.post(channelThread, { markdown: "x", files: [file("a")] }))
        yield* TestClock.adjust("1 second")
        const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* TestClock.adjust("61 seconds")
        yield* Fiber.join(interrupting)
        assert.strictEqual(fake.called("chat.update").length, 1)
        assert.deepStrictEqual(fake.called("chat.delete")[0].params, { channel, ts })
        assert.deepStrictEqual(fake.called("files.delete").map((call) => call.params.file), ["F1"])
      })
    )
  })

  it.effect("a refused attach deletes the message and the files and fails file_refused", () => {
    const fake = makeFake({
      ...upload(["F1"]),
      "chat.postMessage": posted(ts),
      "chat.update": { ok: false, error: "file_not_found" }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const error = yield* Effect.flip(slack.post(channelThread, { markdown: "x", files: [file("a")] }))
        assert.deepStrictEqual([error.reason._tag, error.reason.detail, error.retry], [
          "NotFound",
          fileRefused,
          "denied"
        ])
        assert.strictEqual(methods(fake).slice(-3).join(), "chat.update,chat.delete,files.delete")
        assert.deepStrictEqual(fake.called("chat.delete")[0].params, { channel, ts })
      })
    )
  })

  it.effect("a rollback that can't delete the message fails uncertain with SlackAttachFailed", () => {
    const fake = makeFake({
      ...upload(["F1", "F2"]),
      "chat.postMessage": posted(ts),
      "chat.update": { ok: false, error: "file_not_found" },
      "chat.delete": { ok: false, error: "cant_delete_message" }
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const error = yield* Effect.flip(slack.post(replyThread, { markdown: "x", files: [file("a"), file("b")] }))
        assert.deepStrictEqual(
          [error.reason._tag, error.reason.detail, error.retry],
          ["Unknown", "attach_failed_message_left", "uncertain"]
        )
        const cause = error.reason.cause
        assert.instanceOf(cause, SlackChat.SlackAttachFailed)
        assert.deepStrictEqual(cause.thread, replyThread)
        assert.strictEqual(cause.messageId, ts)
        assert.deepStrictEqual(cause.fileIds, ["F1", "F2"])
        assert.deepStrictEqual([cause.reason._tag, cause.reason.detail], ["NotFound", "file_not_found"])
        assert.notInclude(cause.message, ts)
        assert.notInclude(cause.message, "F1")
        // The files are kept, so the ids it carries still mean something.
        assert.strictEqual(fake.called("files.delete").length, 0)
      })
    )
  })

  it.effect("post/refusedFile passes over the stub", () => {
    let refuse = false
    const fake = makeFake({
      ...upload(["F1"]),
      "auth.test": authTest,
      "conversations.history": { ok: true, messages: [] },
      "files.completeUploadExternal": () =>
        refuse ? { ok: false, error: "invalid_arguments" } : { ok: true, files: [{ id: "F1" }] }
    })
    const rules = conformance({
      platform: "slack",
      thread: channelThread,
      userPosts: () => Effect.die("unused"),
      parseMention: SlackChat.parseMention,
      refuseFiles: () =>
        Effect.sync(() => {
          refuse = true
        })
    })
    return run(
      fake,
      Effect.gen(function*() {
        yield* rules["post/refusedFile"]
        assert.strictEqual(fake.called("chat.postMessage").length, 0)
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

  it.effect("the doubled interval goes to the part that continues the reply, not to another reply", () => {
    const next = "1794509201.000100"
    const other = "1794509202.000100"
    const fake = makeFake({
      "chat.appendStream": [{ status: 429, headers: { "retry-after": "3" } }, posted(other), posted(next)],
      "chat.stopStream": { ok: true, message: { ts } },
      "chat.startStream": [posted(other), posted(next), posted("1794509203.000100")]
    })
    return run(
      fake,
      Effect.gen(function*() {
        const native = (yield* adapter).nativeStream!
        const recipient = "U080YLYB277"
        assert.strictEqual((yield* reason(native.append(replyThread, ts, "a", { flush: true }))).tag, "RateLimited")
        yield* native.stop(replyThread, ts, { end: "rotating" })
        // Another reply in the thread starts and appends at once.
        yield* native.start(replyThread, { markdown: "x", recipient })
        yield* native.append(replyThread, other, "y", { flush: true })
        assert.strictEqual(fake.called("chat.appendStream").length, 2)
        // The reply's next part waits for the retry-after.
        const start = yield* Effect.forkChild(native.start(replyThread, { markdown: "b", recipient, continues: ts }))
        yield* TestClock.adjust("2999 millis")
        assert.strictEqual(fake.called("chat.startStream").length, 1)
        yield* TestClock.adjust("1 millis")
        assert.strictEqual((yield* Fiber.join(start)).id, next)
        // Its appends keep the doubled interval, two seconds.
        const append = yield* Effect.forkChild(native.append(replyThread, next, "c", { flush: true }))
        yield* TestClock.adjust("1999 millis")
        assert.strictEqual(fake.called("chat.appendStream").length, 2)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(append)
        assert.strictEqual(fake.called("chat.appendStream").length, 3)
        // A reply that ends hands nothing on.
        yield* native.stop(replyThread, next, { end: "done" })
        yield* native.start(replyThread, { markdown: "d", recipient, continues: next })
        assert.strictEqual(fake.called("chat.startStream").length, 3)
      })
    )
  })

  it.effect("an edit retried after a 429 keeps the doubled interval", () => {
    const fake = makeFake({
      "chat.update": [{ status: 429, headers: { "retry-after": "1" } }, { ok: true }, { ok: true }]
    })
    return run(
      fake,
      Effect.gen(function*() {
        const slack = yield* adapter
        const first = yield* Effect.forkChild(slack.edit(replyThread, ts, { markdown: "a" }))
        yield* TestClock.adjust("1 second")
        yield* Fiber.join(first)
        assert.strictEqual(fake.called("chat.update").length, 2)
        // Six seconds, twice the three second floor.
        const second = yield* Effect.forkChild(slack.edit(replyThread, ts, { markdown: "ab" }))
        yield* TestClock.adjust("5999 millis")
        assert.strictEqual(fake.called("chat.update").length, 2)
        yield* TestClock.adjust("1 millis")
        yield* Fiber.join(second)
        assert.strictEqual(fake.called("chat.update").length, 3)
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
