import { assert, describe, it } from "@effect/vitest"
import { type Cause, Deferred, Duration, Effect, Fiber, Queue, Stream } from "effect"
import { Chat, ChatAdapter, ChatError, ChatMarkdown, ChatTest } from "effect/chat"
import type { ChatThread } from "effect/chat"
import { TestClock } from "effect/testing"

const codePoints = (markdown: string) => [...markdown].length

const joined = (parts: ReadonlyArray<ChatMarkdown.Part>) => parts.map((part) => part.text).join("")

const paragraphs = (count: number, size: number) =>
  Array.from({ length: count }, (_, i) => ("Paragraph " + i + " ").padEnd(size, "x")).join("\n\n")

const settle = Effect.forEach(Array.from({ length: 50 }), () => Effect.yieldNow, { discard: true })

const setup = Effect.gen(function*() {
  const test = yield* ChatTest.ChatTest
  const thread = yield* test.makeThread()
  return { test, thread }
})

const texts = (test: ChatTest.ChatTest["Service"], thread: ChatThread.ChatThread) =>
  Effect.map(test.messages(thread), (messages) => messages.map((message) => message.text))

/** Runs `stream` over a queue the test feeds. */
const feed = Effect.fnUntraced(function*(
  thread: ChatThread.ChatThread,
  options?: ChatMarkdown.Options<never> & { readonly recipient?: string | undefined }
) {
  const queue = yield* Queue.unbounded<string, Cause.Done>()
  const fiber = yield* Effect.forkChild(ChatMarkdown.stream(thread, Stream.fromQueue(queue), options))
  const send = (chunk: string) => Effect.andThen(Queue.offer(queue, chunk), settle)
  const close = Effect.andThen(Queue.end(queue), settle)
  const end = Effect.andThen(Queue.end(queue), Fiber.join(fiber))
  return { fiber, send, close, end }
})

const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

describe("ChatMarkdown", () => {
  describe("post", () => {
    it.effect("posts nothing for empty input", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const result = yield* ChatMarkdown.post(thread, "")
        assert.deepStrictEqual(result, { parts: [], stopped: false })
        assert.deepStrictEqual(yield* test.calls, [])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("posts short Markdown as one part", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const result = yield* ChatMarkdown.post(thread, "Hello *world*")
        assert.strictEqual(result.parts.length, 1)
        const [part] = result.parts
        assert.deepStrictEqual([part.markdown, part.text, part.kind, part.transport], [
          "Hello *world*",
          "Hello *world*",
          "text",
          "post"
        ])
        assert.deepStrictEqual(yield* texts(test, thread), ["Hello *world*"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("splits at block boundaries", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const input = paragraphs(10, 40)
        const result = yield* ChatMarkdown.post(thread, input, { maxParts: 10 })
        assert.isTrue(result.parts.length > 1)
        assert.strictEqual(joined(result.parts), input)
        for (const part of result.parts) assert.isAtMost(codePoints(part.markdown), 100)
        for (const part of result.parts.slice(0, -1)) assert.isTrue(part.text.endsWith("\n\n"), part.text)
        assert.deepStrictEqual(yield* texts(test, thread), result.parts.map((part) => part.markdown))
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 100 } }))))

    it.effect("closes a code fence and reopens it in the next part", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const input = "```ts\n" + "const a = 1\n".repeat(10) + "```\n"
        const result = yield* ChatMarkdown.post(thread, input)
        assert.isTrue(result.parts.length > 1)
        assert.strictEqual(joined(result.parts), input)
        assert.isTrue(result.parts[0].markdown.endsWith("\n```"), result.parts[0].markdown)
        for (const part of result.parts.slice(1)) assert.isTrue(part.markdown.startsWith("```ts\n"), part.markdown)
        for (const part of result.parts) assert.isAtMost(codePoints(part.markdown), 60)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 60 } }))))

    it.effect("measures with the adapter's measure", () => {
      const measure = (markdown: string) => codePoints(markdown) + 3 * markdown.split("<").length - 3
      return Effect.gen(function*() {
        const { thread } = yield* setup
        const input = "a<b\n\n".repeat(8)
        const result = yield* ChatMarkdown.post(thread, input)
        assert.strictEqual(result.parts.length, 2)
        assert.strictEqual(joined(result.parts), input)
        for (const part of result.parts) assert.isAtMost(measure(part.markdown), 50)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 50 }, measure })))
    })

    it.effect("never cuts inside a surrogate pair", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const input = "\u{1F600}".repeat(12)
        const result = yield* ChatMarkdown.post(thread, input)
        assert.strictEqual(result.parts.length, 3)
        assert.strictEqual(joined(result.parts), input)
        for (const part of result.parts) assert.isFalse(lone.test(part.markdown), part.markdown)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 5 } }))))

    it.effect("replies with the first part only", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const event = yield* test.userPosts(thread, { text: "question" })
        assert(event._tag === "MessageCreated")
        const replyTo = { messageId: event.message.id }
        const result = yield* ChatMarkdown.post(thread, paragraphs(3, 20), { replyTo })
        const messages = yield* test.messages(thread)
        const replies = result.parts.map((part) => messages.find((message) => message.id === part.messageId)?.replyTo)
        assert.deepStrictEqual(replies.map((reply) => reply?.messageId), [event.message.id, undefined, undefined])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("runs onPart for every part", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const seen: Array<string> = []
        const result = yield* ChatMarkdown.post(thread, paragraphs(3, 20), {
          onPart: (part) => Effect.sync(() => seen.push(part.messageId))
        })
        assert.deepStrictEqual(seen, result.parts.map((part) => part.messageId))
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("fails with Overflow past maxParts", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const input = paragraphs(5, 20)
        const error = yield* Effect.flip(ChatMarkdown.post(thread, input, { maxParts: 2 }))
        assert.strictEqual(error.cause._tag, "Overflow")
        assert.strictEqual(error.posted.length, 2)
        assert.isUndefined(error.uncertain)
        assert.strictEqual(joined(error.posted) + error.remaining, input)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("uploads the rest past maxParts as a file", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const input = paragraphs(5, 20)
        const result = yield* ChatMarkdown.post(thread, input, { maxParts: 2, overflow: { file: { name: "rest.md" } } })
        assert.deepStrictEqual(result.parts.map((part) => part.kind), ["text", "text", "overflowFile"])
        assert.strictEqual(joined(result.parts), input)
        const last = (yield* test.messages(thread)).at(-1)!
        assert.deepStrictEqual(last.attachments.map((attachment) => attachment.name), ["rest.md"])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    const files = [{ name: "a.txt", contentType: "text/plain", content: new TextEncoder().encode("a") }]

    it.effect("sends files with the last part", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* ChatMarkdown.post(thread, paragraphs(3, 20), { files })
        const messages = yield* test.messages(thread)
        assert.deepStrictEqual(messages.map((message) => message.attachments.length), [0, 0, 1])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("ends in the unattached note when the files are refused", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("post", new ChatError.Forbidden({ detail: "file_uploads_disabled" }))
        const result = yield* ChatMarkdown.post(thread, "Report", {
          files,
          unattachedNote: (files) => "\n\n(" + files.length + " file not attached)"
        })
        assert.deepStrictEqual(result.parts.map((part) => [part.markdown, part.text]), [[
          "Report\n\n(1 file not attached)",
          "Report"
        ]])
        const messages = yield* test.messages(thread)
        assert.deepStrictEqual(messages.map((message) => message.attachments.length), [0])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("fails when the files are refused without a note", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("post", new ChatError.Forbidden({ detail: "file_uploads_disabled" }))
        const error = yield* Effect.flip(ChatMarkdown.post(thread, "Report", { files }))
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "Forbidden")
        assert.deepStrictEqual([error.posted, error.remaining], [[], "Report"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("fails on a TooLarge that does not blame the files", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("post", new ChatError.TooLarge({ detail: "msg_blocks_too_long" }))
        const error = yield* Effect.flip(ChatMarkdown.post(thread, "Report", {
          files,
          unattachedNote: () => " (file not attached)"
        }))
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "TooLarge")
        assert.deepStrictEqual([error.posted, error.uncertain, error.remaining], [[], undefined, "Report"])
        assert.strictEqual((yield* test.calls).filter((call) => call.op === "post").length, 1)
        assert.deepStrictEqual(yield* texts(test, thread), [])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("ends in the unattached note when the files are too large", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("post", new ChatError.TooLarge({ subject: "files", detail: "file_too_large" }))
        const result = yield* ChatMarkdown.post(thread, "Report", {
          files,
          unattachedNote: () => " (file not attached)"
        })
        assert.deepStrictEqual(result.parts.map((part) => part.markdown), ["Report (file not attached)"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("does not retry without the files for a failure unrelated to them", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("post", new ChatError.NotFound({ detail: "channel_not_found" }))
        const error = yield* Effect.flip(ChatMarkdown.post(thread, "Report", {
          files,
          unattachedNote: () => " (file not attached)"
        }))
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "NotFound")
        assert.strictEqual((yield* test.calls).filter((call) => call.op === "post").length, 1)
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("keeps the files and blank text that follow the last cut", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const input = "abcde\n\n"
        const result = yield* ChatMarkdown.post(thread, input, { files })
        assert.deepStrictEqual(result.parts.map((part) => [part.markdown, part.text]), [["abcde", input]])
        const messages = yield* test.messages(thread)
        assert.deepStrictEqual(messages.map((message) => message.attachments.length), [1])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 5 } }))))

    it.effect("sends the files with the overflow file", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const input = paragraphs(5, 20)
        const result = yield* ChatMarkdown.post(thread, input, {
          files,
          maxParts: 2,
          overflow: { file: { name: "rest.md" } }
        })
        assert.strictEqual(joined(result.parts), input)
        const last = (yield* test.messages(thread)).at(-1)!
        assert.deepStrictEqual(last.attachments.map((attachment) => attachment.name), ["rest.md", "a.txt"])
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("reports the text of an uncertain post as uncertain", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const input = paragraphs(3, 20)
        const error = yield* Effect.flip(ChatMarkdown.post(thread, input, {
          onPart: () => test.failNext("post", new ChatError.Unknown({ detail: "timeout" }))
        }))
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "Unknown")
        assert.strictEqual(error.posted.length, 1)
        assert.strictEqual(error.uncertain, "Paragraph 1 xxxxxxxx\n\n")
        assert.strictEqual(joined(error.posted) + error.uncertain + error.remaining, input)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    it.effect("paces the parts by minWriteInterval", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const fiber = yield* Effect.forkChild(ChatMarkdown.post(thread, paragraphs(3, 20)))
        yield* settle
        assert.strictEqual((yield* test.calls).length, 1)
        yield* TestClock.adjust("999 millis")
        assert.strictEqual((yield* test.calls).length, 1)
        yield* TestClock.adjust("1 millis")
        assert.strictEqual((yield* test.calls).length, 2)
        yield* TestClock.adjust("1 second")
        const result = yield* Fiber.join(fiber)
        assert.strictEqual(result.parts.length, 3)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30, minWriteInterval: Duration.seconds(1) } }))))

    it.effect("keeps message text out of the error's message and JSON", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const error = yield* Effect.flip(ChatMarkdown.post(thread, paragraphs(5, 20), { maxParts: 1 }))
        assert.notInclude(error.message, "Paragraph")
        assert.notInclude(JSON.stringify(error.toJSON()), "Paragraph")
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))
  })

  describe("stream", () => {
    it.effect("posts nothing for an empty stream", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const result = yield* ChatMarkdown.stream(thread, Stream.empty, { recipient: "U1" })
        assert.deepStrictEqual(result, { parts: [], stopped: false })
        assert.deepStrictEqual(yield* test.calls, [])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("posts and then edits without a recipient", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread)
        yield* send("Hello")
        yield* send(" world\n\n```ts\nconst")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => part.transport), ["edit"])
        assert.deepStrictEqual(yield* texts(test, thread), ["Hello world\n\n```ts\nconst\n```"])
        const calls = yield* test.calls
        assert.deepStrictEqual(calls.map((call) => call.op), ["post", "edit"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("writes natively with a recipient, sending held text again", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("hello\n")
        yield* send("x < y\n")
        yield* send("```ts\ncode")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => [part.transport, part.text]), [[
          "native",
          "hello\nx < y\n```ts\ncode"
        ]])
        assert.deepStrictEqual(yield* texts(test, thread), ["hello\nx < y\n```ts\ncode\n```"])
        const calls = yield* test.calls
        assert.deepStrictEqual(calls.map((call) => [call.op, call.markdown]), [
          ["nativeStream.start", "hello\n"],
          ["nativeStream.append", "x < y\n"],
          ["nativeStream.append", "< y\n```ts\ncode"],
          ["nativeStream.append", "< y\n```ts\ncode\n```"],
          ["nativeStream.stop", undefined]
        ])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("rolls a native stream over at a block boundary", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        const input = paragraphs(6, 28) + "\n\n"
        for (const chunk of input.split(/(?<=\n\n)/)) yield* send(chunk)
        const result = yield* end
        assert.isTrue(result.parts.length > 1)
        assert.strictEqual(joined(result.parts), input)
        for (const part of result.parts) {
          assert.strictEqual(part.transport, "native")
          assert.isTrue(part.text.endsWith("\n\n"), part.text)
        }
        const messages = yield* texts(test, thread)
        assert.deepStrictEqual(messages, result.parts.map((part) => part.markdown))
        for (const message of messages) assert.isAtMost(codePoints(message), 100)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 100 } }))))

    it.effect("forces a rollover on a TooLarge append", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.TooLarge({ detail: "msg_too_long" }))
        yield* send("two\n")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => part.text), ["one\n", "two\n"])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n", "two\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("falls back to post-then-edit when the start is Unsupported", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        yield* test.failNext("nativeStream.start", new ChatError.Unsupported({ capability: "nativeStream" }))
        const result = yield* ChatMarkdown.stream(thread, Stream.make("one\n", "two\n"), { recipient: "U1" })
        assert.deepStrictEqual(result.parts.map((part) => part.transport), ["edit"])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("reports a click on stop that the consumer ignored", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const ids: Array<string> = []
        const { end, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: (part) => Effect.sync(() => ids.push(part.messageId))
        })
        yield* send("one\n")
        yield* test.clickStop(ids[0])
        yield* send("two\n")
        const result = yield* end
        assert.isTrue(result.stopped)
        assert.strictEqual(joined(result.parts), "one\ntwo\n")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("ends the reply stopped when an append comes back stopped", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const ids: Array<string> = []
        const { fiber, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: (part) => Effect.sync(() => ids.push(part.messageId))
        })
        yield* send("one\n")
        yield* test.clickStop(ids[0])
        yield* test.closeStream(ids[0])
        yield* send("two\n")
        const result = yield* Fiber.join(fiber)
        assert.isTrue(result.stopped)
        assert.strictEqual(joined(result.parts), "one\n")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("carries on by edit when the stream is closed", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const ids: Array<string> = []
        const { end, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: (part) => Effect.sync(() => ids.push(part.messageId))
        })
        yield* send("one\n")
        yield* test.closeStream(ids[0])
        yield* send("two\n")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => [part.transport, part.text]), [["native", "one\ntwo\n"]])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\n"])
        const ops = (yield* test.calls).map((call) => call.op)
        assert.include(ops, "edit")
        assert.notInclude(ops, "nativeStream.stop")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("tries a failed append again on a timer", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.RateLimited({ retryAfter: Duration.seconds(2) }))
        yield* send("two\n")
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n"])
        yield* TestClock.adjust("2 seconds")
        yield* settle
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\n"])
        const result = yield* end
        assert.strictEqual(joined(result.parts), "one\ntwo\n")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("repairs by edit after three retry failures", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.RateLimited({}), { times: 3 })
        yield* send("two\n")
        yield* send("three\n")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => [part.transport, part.text]), [[
          "native",
          "one\ntwo\nthree\n"
        ]])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\nthree\n"])
        const ops = (yield* test.calls).map((call) => call.op)
        assert.deepStrictEqual(ops.filter((op) => op === "nativeStream.append").length, 3)
        assert.include(ops, "edit")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("repairs by edit after an uncertain append", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.Unknown({}), { landed: true })
        yield* send("two\n")
        yield* send("three\n")
        const result = yield* end
        assert.strictEqual(joined(result.parts), "one\ntwo\nthree\n")
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\nthree\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("fails on a denied append, after stopping the stream", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.Forbidden({}))
        yield* send("two\n")
        const error = yield* Effect.flip(Fiber.join(fiber))
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "Forbidden")
        assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], ["one\n", undefined, "two\n"])
        assert.include((yield* test.calls).map((call) => call.op), "nativeStream.stop")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("finishes what was received when the upstream fails", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const deltas = Stream.concat(Stream.make("```ts\n", "code\n", "more"), Stream.fail("boom"))
        const error = yield* Effect.flip(ChatMarkdown.stream(thread, deltas, { recipient: "U1" }))
        assert.deepStrictEqual(error.cause, { _tag: "Upstream", error: "boom" })
        assert.deepStrictEqual([joined(error.posted), error.remaining], ["```ts\ncode\nmore", ""])
        assert.deepStrictEqual(yield* texts(test, thread), ["```ts\ncode\nmore\n```"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("finishes what was received when interrupted", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("```ts\ncode\n")
        yield* Fiber.interrupt(fiber)
        assert.deepStrictEqual(yield* texts(test, thread), ["```ts\ncode\n```"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("does not post again when interrupted while onPart runs", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const { fiber, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: () => Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(release))
        })
        yield* send("hello\n")
        yield* Deferred.await(entered)
        const interrupt = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* settle
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(interrupt)
        assert.deepStrictEqual(yield* texts(test, thread), ["hello\n"])
        const ops = (yield* test.calls).map((call) => call.op)
        assert.deepStrictEqual(ops.filter((op) => op === "nativeStream.start").length, 1)
        assert.include(ops, "nativeStream.stop")
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("repairs with the retried chunk while the upstream is paused", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.RateLimited({ retryAfter: Duration.millis(100) }), {
          times: 3
        })
        yield* send("two\n")
        yield* TestClock.adjust("200 millis")
        yield* settle
        const ops = (yield* test.calls).map((call) => call.op)
        assert.strictEqual(ops.filter((op) => op === "nativeStream.append").length, 3)
        assert.include(ops, "nativeStream.stop")
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("partitions an uncertain repair followed by a denied edit", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.Unknown({}), { landed: true })
        yield* test.failNext("edit", new ChatError.Unknown({}), { landed: true })
        yield* send("two\n")
        yield* test.failNext("edit", new ChatError.Forbidden({}))
        yield* send("three\n")
        const error = yield* Effect.flip(Fiber.join(fiber))
        assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], ["one\n", "two\n", "three\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("leaves room in a native stream to close a code fence", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("~~~\n")
        yield* send("a".repeat(16))
        const result = yield* end
        assert.strictEqual(joined(result.parts), "~~~\n" + "a".repeat(16))
        const messages = yield* texts(test, thread)
        assert.isTrue(messages.length > 1)
        for (const message of messages) {
          assert.isTrue(message.endsWith("\n~~~"), message)
          assert.isAtMost(codePoints(message), 20)
        }
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 20 } }))))

    it.effect("closes a code fence before rotating on age", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("```ts\none\n")
        yield* TestClock.adjust("9 minutes")
        yield* send("two\n")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => part.text), ["```ts\none\n", "two\n"])
        assert.deepStrictEqual(yield* texts(test, thread), ["```ts\none\n```", "```ts\ntwo\n```"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("rotates a native stream on age", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* TestClock.adjust("9 minutes")
        yield* send("two\n")
        const result = yield* end
        assert.deepStrictEqual(result.parts.map((part) => [part.transport, part.text]), [["native", "one\n"], [
          "native",
          "two\n"
        ]])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n", "two\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("takes the text that arrived while waiting for the write interval", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { end, send } = yield* feed(thread)
        yield* send("a\n")
        yield* send("b\n")
        yield* send("c\n")
        yield* TestClock.adjust("1 second")
        yield* settle
        const calls = yield* test.calls
        assert.deepStrictEqual(calls.map((call) => [call.op, call.markdown]), [["post", "a\n"], ["edit", "a\nb\nc\n"]])
        const ended = yield* Effect.forkChild(end)
        yield* settle
        yield* TestClock.adjust("1 second")
        const result = yield* Fiber.join(ended)
        assert.strictEqual(joined(result.parts), "a\nb\nc\n")
      }).pipe(Effect.provide(ChatTest.layer({ limits: { minWriteInterval: Duration.seconds(1) } }))))

    it.effect("fails with Overflow past maxParts", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const input = paragraphs(5, 20)
        const error = yield* Effect.flip(ChatMarkdown.stream(thread, Stream.make(input), { maxParts: 1 }))
        assert.strictEqual(error.cause._tag, "Overflow")
        assert.strictEqual(joined(error.posted) + error.remaining, input)
      }).pipe(Effect.provide(ChatTest.layer({ limits: { messageLength: 30 } }))))

    /** Registers the test adapter with its native stream changed by `f`. */
    const patchNative = Effect.fnUntraced(function*(
      f: (native: ChatAdapter.NativeStream) => Partial<ChatAdapter.NativeStream>
    ) {
      const test = yield* ChatTest.ChatTest
      const registry = yield* ChatAdapter.Registry
      const adapter = yield* registry.get(test.platform)
      const native = adapter.nativeStream!
      yield* registry.register({ ...adapter, nativeStream: { ...native, ...f(native) } })
    })

    it.effect("a rotated stream's start names the part it continues", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const continues: Array<string | undefined> = []
        yield* patchNative((native) => ({
          start: (thread, options) =>
            Effect.suspend(() => {
              continues.push(options.continues)
              return native.start(thread, options)
            })
        }))
        const { end, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* TestClock.adjust("9 minutes")
        yield* send("two\n")
        const result = yield* end
        assert.deepStrictEqual(continues, [undefined, result.parts[0].messageId])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("sends a stop again when interrupted during it", () =>
      Effect.gen(function*() {
        const { thread } = yield* setup
        const chat = yield* Chat.Chat
        const entered = yield* Deferred.make<void>()
        let first = true
        yield* patchNative((native) => ({
          stop: (...args) =>
            Effect.suspend(() => {
              if (!first) return native.stop(...args)
              first = false
              return Effect.andThen(Deferred.succeed(entered, undefined), Effect.never)
            })
        }))
        const ids: Array<string> = []
        const { close, fiber, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: (part) => Effect.sync(() => void ids.push(part.messageId))
        })
        yield* send("hello\n")
        yield* close
        yield* Deferred.await(entered)
        yield* Fiber.interrupt(fiber)
        yield* chat.edit(thread, ids[0], { markdown: "edited" })
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("keeps a rollover due after an append that was in flight when interrupted", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        let first = true
        yield* patchNative((native) => ({
          append: (...args) =>
            Effect.tap(native.append(...args), () => {
              if (!first) return Effect.void
              first = false
              return Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(release))
            })
        }))
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("~~~\none\n")
        yield* TestClock.adjust("9 minutes")
        yield* send("two\n")
        yield* Deferred.await(entered)
        const interrupt = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* settle
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(interrupt)
        assert.deepStrictEqual(yield* texts(test, thread), ["~~~\none\n~~~", "~~~\ntwo\n~~~"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("bounds an append in the interrupt finalizer by the finish timeout", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const entered = yield* Deferred.make<void>()
        yield* patchNative((native) => ({
          append: (...args) =>
            Effect.andThen(Deferred.succeed(entered, undefined), Effect.andThen(Effect.never, native.append(...args)))
        }))
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("~~~\ncode")
        const interrupt = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* Deferred.await(entered)
        yield* TestClock.adjust("6 seconds")
        yield* Fiber.join(interrupt)
        // The closing fence was cut off with the append.
        assert.deepStrictEqual(yield* texts(test, thread), ["~~~\ncode"])
      }).pipe(Effect.provide(ChatTest.layer())))

    /** Runs `stream` over a queue the test can fail. */
    const feedFailable = Effect.fnUntraced(function*(thread: ChatThread.ChatThread) {
      const queue = yield* Queue.unbounded<string, string>()
      const fiber = yield* Effect.forkChild(
        Effect.flip(ChatMarkdown.stream(thread, Stream.fromQueue(queue), { recipient: "U1" }))
      )
      return { queue, fiber }
    })

    /** Holds the first append until `release` completes, and records whether it was cut off. */
    const holdFirstAppend = Effect.fnUntraced(function*() {
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const state = { cancelled: false }
      let first = true
      yield* patchNative((native) => ({
        append: (...args) =>
          Effect.suspend(() => {
            if (!first) return native.append(...args)
            first = false
            return Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(release)).pipe(
              Effect.andThen(native.append(...args)),
              Effect.onInterrupt(() => Effect.sync(() => void (state.cancelled = true)))
            )
          })
      }))
      return { entered, release, state }
    })

    it.effect("bounds an append in flight when the upstream fails", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { entered, release, state } = yield* holdFirstAppend()
        const { fiber, queue } = yield* feedFailable(thread)
        yield* Queue.offer(queue, "one\n")
        yield* settle
        yield* Queue.offer(queue, "two\n")
        yield* Deferred.await(entered)
        yield* Queue.fail(queue, "boom")
        yield* settle
        yield* TestClock.adjust("6 seconds")
        const finished = fiber.pollUnsafe() !== undefined
        yield* Deferred.succeed(release, undefined)
        const error = yield* Fiber.join(fiber)
        assert.isTrue(finished)
        assert.isTrue(state.cancelled)
        assert.deepStrictEqual(error.cause, { _tag: "Upstream", error: "boom" })
        assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], ["one\n", "two\n", ""])
        yield* settle
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("keeps the answer of an append in flight when the upstream fails", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { entered, release } = yield* holdFirstAppend()
        const { fiber, queue } = yield* feedFailable(thread)
        yield* Queue.offer(queue, "one\n")
        yield* settle
        yield* Queue.offer(queue, "two\n")
        yield* Deferred.await(entered)
        yield* Queue.offer(queue, "three")
        yield* Queue.fail(queue, "boom")
        yield* settle
        yield* Deferred.succeed(release, undefined)
        const error = yield* Fiber.join(fiber)
        assert.deepStrictEqual(error.cause, { _tag: "Upstream", error: "boom" })
        assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], [
          "one\ntwo\nthree",
          undefined,
          ""
        ])
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\nthree"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("bounds an append begun while finishing after the upstream fails", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const { entered, release, state } = yield* holdFirstAppend()
        const { fiber, queue } = yield* feedFailable(thread)
        yield* Queue.offer(queue, "one\n")
        yield* settle
        yield* Queue.offer(queue, "two")
        yield* settle
        yield* Queue.fail(queue, "boom")
        yield* Deferred.await(entered)
        yield* TestClock.adjust("6 seconds")
        const finished = fiber.pollUnsafe() !== undefined
        yield* Deferred.succeed(release, undefined)
        const error = yield* Fiber.join(fiber)
        assert.isTrue(finished)
        assert.isTrue(state.cancelled)
        assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], ["one\n", "two", ""])
        yield* settle
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    /** Holds the first stop until `release` completes. */
    const holdFirstStop = Effect.fnUntraced(function*() {
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      let first = true
      yield* patchNative((native) => ({
        stop: (...args) =>
          Effect.suspend(() => {
            if (!first) return native.stop(...args)
            first = false
            return Effect.andThen(
              Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(release)),
              native.stop(...args)
            )
          })
      }))
      return { entered, release }
    })

    for (const failUpstream of [false, true]) {
      it.effect(
        failUpstream
          ? "stops the stream after a denied append when the upstream then fails"
          : "stops the stream after a denied append",
        () =>
          Effect.gen(function*() {
            const { test, thread } = yield* setup
            const chat = yield* Chat.Chat
            const { entered, release } = yield* holdFirstStop()
            const queue = yield* Queue.unbounded<string, string>()
            const ids: Array<string> = []
            const fiber = yield* Effect.forkChild(Effect.flip(ChatMarkdown.stream(thread, Stream.fromQueue(queue), {
              recipient: "U1",
              onPart: (part) => Effect.sync(() => void ids.push(part.messageId))
            })))
            yield* Queue.offer(queue, "one\n")
            yield* settle
            yield* test.failNext("nativeStream.append", new ChatError.Forbidden({}))
            yield* Queue.offer(queue, "two\n")
            yield* Deferred.await(entered)
            if (failUpstream) yield* Queue.fail(queue, "boom")
            yield* settle
            yield* Deferred.succeed(release, undefined)
            const error = yield* Fiber.join(fiber)
            assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "Forbidden")
            assert.deepStrictEqual([joined(error.posted), error.uncertain, error.remaining], [
              "one\n",
              undefined,
              "two\n"
            ])
            const ops = (yield* test.calls).map((call) => call.op)
            assert.strictEqual(ops.filter((op) => op === "nativeStream.append").length, 1)
            assert.deepStrictEqual(yield* texts(test, thread), ["one\n"])
            yield* chat.edit(thread, ids[0], { markdown: "edited" })
          }).pipe(Effect.provide(ChatTest.layer()))
      )
    }

    it.effect("bounds the stop of a failed reply by the finish timeout when the upstream fails", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const entered = yield* Deferred.make<void>()
        yield* patchNative(() => ({ stop: () => Effect.andThen(Deferred.succeed(entered, undefined), Effect.never) }))
        const queue = yield* Queue.unbounded<string, string>()
        const fiber = yield* Effect.forkChild(
          Effect.flip(ChatMarkdown.stream(thread, Stream.fromQueue(queue), { recipient: "U1" }))
        )
        yield* Queue.offer(queue, "one\n")
        yield* settle
        yield* test.failNext("nativeStream.append", new ChatError.Forbidden({}))
        yield* Queue.offer(queue, "two\n")
        yield* Deferred.await(entered)
        yield* Queue.fail(queue, "boom")
        yield* settle
        yield* TestClock.adjust("6 seconds")
        const error = yield* Fiber.join(fiber)
        assert.strictEqual(error.cause._tag === "Chat" && error.cause.error.reason._tag, "Forbidden")
        assert.deepStrictEqual([joined(error.posted), error.remaining], ["one\n", "two\n"])
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("stops the stream after a denied append when interrupted during the stop", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const chat = yield* Chat.Chat
        const { entered } = yield* holdFirstStop()
        const ids: Array<string> = []
        const { fiber, send } = yield* feed(thread, {
          recipient: "U1",
          onPart: (part) => Effect.sync(() => void ids.push(part.messageId))
        })
        yield* send("one\n")
        yield* test.failNext("nativeStream.append", new ChatError.Forbidden({}))
        yield* send("two\n")
        yield* Deferred.await(entered)
        yield* Fiber.interrupt(fiber)
        const ops = (yield* test.calls).map((call) => call.op)
        assert.strictEqual(ops.filter((op) => op === "nativeStream.append").length, 1)
        assert.deepStrictEqual(yield* texts(test, thread), ["one\n"])
        yield* chat.edit(thread, ids[0], { markdown: "edited" })
      }).pipe(Effect.provide(ChatTest.layer())))

    it.effect("waits for an append in flight when interrupted, then finishes the reply", () =>
      Effect.gen(function*() {
        const { test, thread } = yield* setup
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        let first = true
        yield* patchNative((native) => ({
          append: (...args) =>
            Effect.suspend(() => {
              if (!first) return native.append(...args)
              first = false
              return Effect.andThen(
                Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(release)),
                native.append(...args)
              )
            })
        }))
        const { fiber, send } = yield* feed(thread, { recipient: "U1" })
        yield* send("one\n")
        yield* send("two\n")
        yield* Deferred.await(entered)
        yield* send("three")
        const interrupt = yield* Effect.forkChild(Fiber.interrupt(fiber))
        yield* settle
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(interrupt)
        assert.deepStrictEqual(yield* texts(test, thread), ["one\ntwo\nthree"])
      }).pipe(Effect.provide(ChatTest.layer())))
  })
})
