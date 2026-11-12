/**
 * Testing tools for chat adapters and their consumers.
 *
 * \`layer\` builds a whole chat in memory: \`Chat\`, its registry and one fake
 * adapter with configurable capabilities and fault injection. \`conformance\`
 * is the suite of rules every adapter obeys, as plain Effects keyed by rule
 * name. \`checkMessage\` and \`checkEvent\` assert the invariants every message
 * and event holds, for fixture tests and live runs.
 *
 * **Details**
 *
 * The fake adapter's mention syntax is \`<@id>\` for a user, \`<@&id>\` for a
 * role, \`<#id>\` for a channel and \`<!id>\` for a broadcast.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as Context from "../Context.ts"
import * as DateTime from "../DateTime.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as Chat from "./Chat.ts"
import type { ChatAdapter, Descriptor, File, Posted } from "./ChatAdapter.ts"
import { checkMessageLength, Registry, retrySafe } from "./ChatAdapter.ts"
import type { Capability, ChatErrorReason } from "./ChatError.ts"
import {
  ChatError,
  Forbidden,
  InvalidRequest,
  isChatError,
  NotFound,
  RateLimited,
  TooLarge,
  Transport,
  Unsupported
} from "./ChatError.ts"
import type { ThreadKind } from "./ChatEvent.ts"
import * as ChatEvent from "./ChatEvent.ts"
import { ChatHandler } from "./ChatHandler.ts"
import type { NotAccepted } from "./ChatHandler.ts"
import type { Attachment, Mention, ReplyTo } from "./ChatMessage.ts"
import * as ChatMessage from "./ChatMessage.ts"
import * as ChatThread from "./ChatThread.ts"

/**
 * Reads a slice of \`ChatMessage.text\` as one of the platform's mention
 * tokens.
 *
 * **Details**
 *
 * The core does not know any platform's syntax, so the caller supplies it. A
 * slice that is not a mention token returns \`None\`.
 *
 * **Gotchas**
 *
 * The name is provisional.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export type ParseMention = (slice: string) => Option.Option<{
  readonly kind: Mention["kind"]
  readonly id: string
}>

/**
 * One call the fake adapter received, in order. Every attempt is a call, so a
 * retried request shows up once per attempt.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface Call {
  readonly op: string
  readonly thread: ChatThread.ChatThread
  readonly messageId?: string | undefined
  readonly markdown?: string | undefined
  readonly files?: ReadonlyArray<File> | undefined
  readonly outcome: "ok" | ChatErrorReason["_tag"]
}

/**
 * Service that controls the fake adapter built by \`layer\`.
 *
 * **Details**
 *
 * - \`makeThread\` creates a fresh address: a channel by default, a direct
 *   conversation, or a thread under a user's message in a fresh channel.
 * - \`userPosts\` puts another identity's message in a thread and returns its
 *   event without delivering it. \`deliver\` delivers an event the way an
 *   adapter does, by calling the \`ChatHandler\` service.
 * - \`messages\` is what a thread shows now, oldest first, and \`calls\` is every
 *   call the adapter received.
 * - \`failNext\` makes the next \`times\` calls of \`op\` fail with \`reason\`.
 *   \`landed\` makes the write happen anyway, which is what \`uncertain\` means.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class ChatTest extends Context.Service<ChatTest, {
  readonly platform: string
  readonly selfId: string
  readonly makeThread: (kind?: ThreadKind) => Effect.Effect<ChatThread.ChatThread>
  readonly userPosts: (thread: ChatThread.ChatThread, message: {
    readonly text: string
    readonly authorId?: string | undefined
    readonly isBot?: boolean | undefined
    readonly mentionsSelf?: boolean | undefined
    readonly replyTo?: ReplyTo | undefined
    readonly files?: ReadonlyArray<File> | undefined
  }) => Effect.Effect<ChatEvent.ChatEvent>
  readonly deliver: (event: ChatEvent.ChatEvent) => Effect.Effect<void, NotAccepted, ChatHandler>
  readonly messages: (thread: ChatThread.ChatThread) => Effect.Effect<ReadonlyArray<ChatMessage.ChatMessage>>
  readonly calls: Effect.Effect<ReadonlyArray<Call>>
  readonly failNext: (op: string, reason: ChatErrorReason, options?: {
    readonly times?: number | undefined
    readonly landed?: boolean | undefined
  }) => Effect.Effect<void>
}>()("effect/chat/ChatTest") {}

// -----------------------------------------------------------------------------
// fake adapter
// -----------------------------------------------------------------------------

const allCapabilities: ReadonlyArray<Capability> = [
  "edit",
  "delete",
  "fetchMessage",
  "history",
  "download",
  "files",
  "replyTo",
  "startThread",
  "getThread",
  "opener",
  "getUser"
]

interface StoredThread {
  readonly thread: ChatThread.ChatThread
  readonly kind: ThreadKind
  readonly name?: string | undefined
  readonly parent?: ChatThread.ChatThread | undefined
  readonly openerId?: string | undefined
  readonly createdAt: DateTime.Utc
}

interface StoredMessage {
  readonly id: string
  readonly thread: ChatThread.ChatThread
  readonly authorId: string
  readonly isBot: boolean
  readonly isSelf: boolean
  text: string
  mentions: ReadonlyArray<Mention>
  readonly replyTo?: ReplyTo | undefined
  readonly attachments: ReadonlyArray<{ readonly attachment: Attachment; readonly content: Uint8Array }>
  readonly timestamp: DateTime.Utc
}

interface Fault {
  readonly reason: ChatErrorReason
  remaining: number
  readonly landed: boolean
}

const mentionPattern = /<(@&|@|#|!)([^<>\s]+)>/g

const mentionKinds: Record<string, Mention["kind"]> = {
  "@": "user",
  "@&": "role",
  "#": "channel",
  "!": "broadcast"
}

const parseMentions = (text: string, selfId: string): ReadonlyArray<Mention> =>
  Array.from(text.matchAll(mentionPattern), (match) => {
    const kind = mentionKinds[match[1]]
    return {
      kind,
      id: match[2],
      start: match.index,
      end: match.index + match[0].length,
      isSelf: kind === "user" && match[2] === selfId
    }
  })

const downloadChunkSize = 1024

const makeFake = (options: {
  readonly platform: string
  readonly selfId: string
  readonly capabilities: ReadonlyArray<Capability>
  readonly limits: Partial<Descriptor["limits"]>
}) => {
  const { platform, selfId } = options
  const descriptor: Descriptor = {
    platform,
    capabilities: new Set(options.capabilities.filter((capability) => capability !== "nativeStream")),
    limits: {
      messageLength: 4000,
      filesPerMessage: 10,
      uploadBytes: 10 * 1024 * 1024,
      minWriteInterval: Duration.zero,
      ...options.limits
    }
  }
  const threads = new Map<string, StoredThread>()
  const messages = new Map<string, StoredMessage>()
  const order: Array<string> = []
  const threadUnder = new Map<string, ChatThread.ChatThread>()
  const users = new Map<string, { readonly isBot: boolean }>([[selfId, { isBot: true }]])
  const calls: Array<Call> = []
  const faults = new Map<string, Array<Fault>>()
  let counter = 0
  const nextId = (prefix: string) => prefix + String(++counter)

  const chatError = (op: string, reason: ChatErrorReason) => new ChatError({ platform, op, reason })
  const fail = (op: string, reason: ChatErrorReason) => Effect.fail(chatError(op, reason))

  const toMessage = (message: StoredMessage): ChatMessage.ChatMessage => ({
    id: message.id,
    thread: message.thread,
    author: {
      id: message.authorId,
      name: message.isSelf ? "test-bot" : message.authorId,
      isBot: message.isBot,
      isSelf: message.isSelf
    },
    text: message.text,
    mentions: message.mentions,
    ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
    attachments: message.attachments.map((stored) => stored.attachment),
    timestamp: message.timestamp,
    raw: {
      type: "message",
      id: message.id,
      channel: message.thread.id,
      user: message.authorId,
      text: message.text
    }
  })

  const findThread = (op: string, thread: ChatThread.ChatThread) =>
    Effect.suspend(() => {
      const stored = threads.get(thread.id)
      return stored === undefined ? fail(op, new NotFound({ detail: "thread_not_found" })) : Effect.succeed(stored)
    })

  const listMessages = (stored: StoredThread): Array<StoredMessage> => {
    const list: Array<StoredMessage> = []
    if (stored.openerId !== undefined) {
      const opener = messages.get(stored.openerId)
      if (opener !== undefined) list.push(opener)
    }
    for (const id of order) {
      const message = messages.get(id)
      if (message !== undefined && ChatThread.equals(message.thread, stored.thread)) list.push(message)
    }
    return list
  }

  const findMessage = (op: string, thread: ChatThread.ChatThread, messageId: string) =>
    Effect.flatMap(findThread(op, thread), (stored) => {
      const message = listMessages(stored).find((message) => message.id === messageId)
      return message === undefined
        ? fail(op, new NotFound({ detail: "message_not_found" }))
        : Effect.succeed(message)
    })

  const store = (message: Omit<StoredMessage, "id" | "timestamp">) =>
    Effect.map(DateTime.now, (timestamp) => {
      const stored: StoredMessage = { ...message, id: nextId("m"), timestamp }
      messages.set(stored.id, stored)
      order.push(stored.id)
      return stored
    })

  const storeFiles = (files: ReadonlyArray<File> | undefined) =>
    (files ?? []).map((file) => ({
      attachment: {
        id: nextId("f"),
        name: file.name,
        contentType: file.contentType,
        size: file.content.length
      },
      content: file.content
    }))

  const createThread = (
    op: string,
    thread: ChatThread.ChatThread,
    messageId: string,
    name: string | undefined
  ) =>
    Effect.flatMap(findMessage(op, thread, messageId), (message) => {
      const existing = threadUnder.get(message.id)
      if (existing !== undefined) return Effect.succeed(existing)
      const parent = threads.get(message.thread.id)!
      if (parent.kind === "thread" || !ChatThread.equals(message.thread, thread)) {
        return fail(op, new InvalidRequest({ detail: "cannot_thread_reply" }))
      }
      return Effect.map(DateTime.now, (createdAt) => {
        const created = ChatThread.make(platform, thread.id + "/" + message.id)
        threads.set(created.id, {
          thread: created,
          kind: "thread",
          name,
          parent: thread,
          openerId: message.id,
          createdAt
        })
        threadUnder.set(message.id, created)
        return created
      })
    })

  const takeFault = (op: string): Fault | undefined => {
    const queue = faults.get(op)
    const fault = queue?.[0]
    if (fault === undefined) return undefined
    fault.remaining--
    if (fault.remaining <= 0) queue!.shift()
    return fault
  }

  const attempt = <A>(
    call: Omit<Call, "outcome">,
    needs: ReadonlyArray<Capability>,
    body: Effect.Effect<A, ChatError>
  ): Effect.Effect<A, ChatError> =>
    retrySafe(Effect.suspend(() => {
      const record = (outcome: Call["outcome"]) => calls.push({ ...call, outcome })
      const missing = needs.find((capability) => !descriptor.capabilities.has(capability))
      if (missing !== undefined) {
        record("Unsupported")
        return fail(call.op, new Unsupported({ capability: missing }))
      }
      const fault = takeFault(call.op)
      if (fault !== undefined) {
        record(fault.reason._tag)
        const failure = fail(call.op, fault.reason)
        return fault.landed ? Effect.flatMap(Effect.exit(body), () => failure) : failure
      }
      return body.pipe(
        Effect.tap(() => Effect.sync(() => record("ok"))),
        Effect.tapError((error) => Effect.sync(() => record(error.reason._tag)))
      )
    }))

  const adapter: ChatAdapter = {
    descriptor,
    post: (thread, content) => {
      const files = content.files ?? []
      const needs: Array<Capability> = []
      if (files.length > 0) needs.push("files")
      if (content.replyTo !== undefined) needs.push("replyTo")
      return attempt(
        { op: "post", thread, markdown: content.markdown, files: content.files },
        needs,
        Effect.gen(function*() {
          yield* findThread("post", thread)
          yield* checkMessageLength(descriptor, "post", content.markdown)
          if (
            files.length > descriptor.limits.filesPerMessage ||
            files.some((file) => file.content.length > descriptor.limits.uploadBytes)
          ) {
            return yield* fail("post", new TooLarge({ detail: "file_too_large" }))
          }
          let replyTo: ReplyTo | undefined
          if (content.replyTo !== undefined) {
            const target = yield* findMessage("post", thread, content.replyTo.messageId)
            replyTo = { messageId: target.id, authorId: target.authorId }
          }
          const stored = yield* store({
            thread,
            authorId: selfId,
            isBot: true,
            isSelf: true,
            text: content.markdown,
            mentions: [],
            replyTo,
            attachments: storeFiles(files)
          })
          return { id: stored.id, thread, timestamp: stored.timestamp } satisfies Posted
        })
      )
    },
    edit: (thread, messageId, content) =>
      attempt(
        { op: "edit", thread, messageId, markdown: content.markdown },
        ["edit"],
        Effect.gen(function*() {
          const message = yield* findMessage("edit", thread, messageId)
          if (!message.isSelf) return yield* fail("edit", new Forbidden({ detail: "cant_update_message" }))
          yield* checkMessageLength(descriptor, "edit", content.markdown)
          message.text = content.markdown
          message.mentions = []
        })
      ),
    delete: (thread, messageId) =>
      attempt(
        { op: "delete", thread, messageId },
        ["delete"],
        Effect.gen(function*() {
          const message = yield* findMessage("delete", thread, messageId)
          if (!message.isSelf) return yield* fail("delete", new Forbidden({ detail: "cant_delete_message" }))
          messages.delete(message.id)
        })
      ),
    fetchMessage: (thread, messageId) =>
      attempt(
        { op: "fetchMessage", thread, messageId },
        ["fetchMessage"],
        Effect.map(findMessage("fetchMessage", thread, messageId), toMessage)
      ),
    history: (thread, options) =>
      Stream.unwrap(attempt(
        { op: "history", thread, messageId: options.from },
        ["history"],
        Effect.gen(function*() {
          const stored = yield* findThread("history", thread)
          const list = listMessages(stored).map(toMessage)
          if (options.direction === "backward") list.reverse()
          if (options.from === undefined) return Stream.fromIterable(list)
          const index = list.findIndex((message) => message.id === options.from)
          if (index === -1) return yield* fail("history", new NotFound({ detail: "message_not_found" }))
          return Stream.fromIterable(list.slice(index + 1))
        })
      )),
    download: (thread, attachment, options) =>
      Stream.unwrap(attempt(
        { op: "download", thread },
        ["download"],
        Effect.suspend(() => {
          let content: Uint8Array | undefined
          for (const message of messages.values()) {
            const found = message.attachments.find((stored) => stored.attachment.id === attachment.id)
            if (found !== undefined) content = found.content
          }
          if (content === undefined) return fail("download", new NotFound({ detail: "file_not_found" }))
          const chunks: Array<Uint8Array> = []
          for (let offset = 0; offset < content.length && offset < options.maxBytes; offset += downloadChunkSize) {
            const end = Math.min(offset + downloadChunkSize, content.length)
            if (end > options.maxBytes) break
            chunks.push(content.slice(offset, end))
          }
          const tooLarge = content.length > options.maxBytes
            ? Stream.fail(chatError("download", new TooLarge({ detail: "max_bytes" })))
            : Stream.empty
          return Effect.succeed(Stream.concat(Stream.fromIterable(chunks), tooLarge))
        })
      )),
    startThread: (thread, messageId, startOptions) =>
      attempt(
        { op: "startThread", thread, messageId },
        ["startThread"],
        createThread("startThread", thread, messageId, startOptions?.name)
      ),
    getThread: (thread) =>
      attempt(
        { op: "getThread", thread },
        ["getThread"],
        Effect.map(findThread("getThread", thread), (stored) => ({
          thread: stored.thread,
          kind: stored.kind,
          name: stored.name,
          parent: stored.parent,
          createdAt: stored.createdAt,
          raw: { id: stored.thread.id, kind: stored.kind }
        }))
      ),
    opener: (thread) =>
      attempt(
        { op: "opener", thread },
        ["opener"],
        Effect.map(findThread("opener", thread), (stored) => {
          const opener = stored.openerId === undefined ? undefined : messages.get(stored.openerId)
          return opener === undefined ? Option.none() : Option.some(toMessage(opener))
        })
      ),
    getUser: (id, userOptions) =>
      attempt(
        { op: "getUser", thread: userOptions?.in ?? ChatThread.make(platform, "") },
        ["getUser"],
        Effect.suspend(() => {
          const user = users.get(id)
          return user === undefined
            ? fail("getUser", new NotFound({ detail: "user_not_found" }))
            : Effect.succeed({
              id,
              name: id === selfId ? "test-bot" : id,
              isBot: user.isBot,
              isSelf: id === selfId,
              raw: { id }
            })
        })
      )
  }

  const addThread = (kind: "channel" | "direct") =>
    Effect.map(DateTime.now, (createdAt) => {
      const thread = ChatThread.make(platform, nextId(kind === "channel" ? "c" : "d"))
      threads.set(thread.id, { thread, kind, createdAt })
      return thread
    })

  const userPosts: ChatTest["Service"]["userPosts"] = Effect.fnUntraced(function*(thread, message) {
    const stored = threads.get(thread.id)
    if (stored === undefined) return yield* Effect.die(new Error("ChatTest.userPosts: unknown thread"))
    const authorId = message.authorId ?? "user"
    const isBot = message.isBot ?? false
    users.set(authorId, { isBot })
    const text = message.mentionsSelf === true ? "<@" + selfId + "> " + message.text : message.text
    const replyTarget = message.replyTo === undefined ? undefined : messages.get(message.replyTo.messageId)
    const created = yield* store({
      thread,
      authorId,
      isBot,
      isSelf: false,
      text,
      mentions: parseMentions(text, selfId),
      replyTo: message.replyTo === undefined ? undefined : {
        messageId: message.replyTo.messageId,
        ...(replyTarget === undefined ? {} : { authorId: replyTarget.authorId })
      },
      attachments: storeFiles(message.files)
    })
    return ChatEvent.MessageCreated.make({
      thread,
      kind: stored.kind,
      message: toMessage(created),
      raw: { type: "event_callback", event_id: nextId("e") }
    })
  })

  const service = ChatTest.of({
    platform,
    selfId,
    makeThread: (kind = "channel") => {
      if (kind !== "thread") return addThread(kind)
      return Effect.gen(function*() {
        const channel = yield* addThread("channel")
        const event = yield* userPosts(channel, { text: "thread opener" })
        const message = (event as ChatEvent.MessageCreated).message
        return yield* Effect.orDie(createThread("makeThread", channel, message.id, undefined))
      })
    },
    userPosts,
    deliver: (event) => Effect.flatMap(ChatHandler, (handler) => handler.handle(event)),
    messages: (thread) =>
      Effect.sync(() => {
        const stored = threads.get(thread.id)
        return stored === undefined ? [] : listMessages(stored).map(toMessage)
      }),
    calls: Effect.sync(() => calls.slice()),
    failNext: (op, reason, failOptions) =>
      Effect.sync(() => {
        const queue = faults.get(op) ?? []
        queue.push({ reason, remaining: failOptions?.times ?? 1, landed: failOptions?.landed ?? false })
        faults.set(op, queue)
      })
  })

  return { adapter, service }
}

/**
 * Creates a whole chat in memory: \`Chat\`, its registry and one fake adapter.
 *
 * **When to use**
 *
 * Use to test code that posts and reads through \`Chat\`, and to run the
 * conformance suite against the fake adapter.
 *
 * **Details**
 *
 * - The platform defaults to \`test\` and the bot's user id to \`bot\`.
 * - Every capability is on by default, except \`nativeStream\`: the fake has no
 *   native stream yet.
 * - The default limits are 4000 characters per message, 10 files of up to
 *   10 MiB, and no write interval.
 * - Two layers merged with different platforms share one \`Chat\`, so routing
 *   can be tested. The \`ChatTest\` service in context is the last one merged.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (options?: {
  readonly platform?: string | undefined
  readonly selfId?: string | undefined
  readonly capabilities?: ReadonlyArray<Capability> | undefined
  readonly limits?: Partial<Descriptor["limits"]> | undefined
}): Layer.Layer<Chat.Chat | Registry | ChatTest> =>
  Layer.effect(
    ChatTest,
    Effect.gen(function*() {
      const registry = yield* Registry
      const { adapter, service } = makeFake({
        platform: options?.platform ?? "test",
        selfId: options?.selfId ?? "bot",
        capabilities: options?.capabilities ?? allCapabilities,
        limits: options?.limits ?? {}
      })
      yield* registry.register(adapter)
      return service
    })
  ).pipe(Layer.provideMerge(Chat.layer))

// -----------------------------------------------------------------------------
// invariants
// -----------------------------------------------------------------------------

/**
 * Error for a conformance rule or invariant that did not hold.
 *
 * **Details**
 *
 * \`rule\` names what failed, and \`expected\` and \`actual\` say how. A platform
 * error behind the failure is in \`cause\`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.5
 */
export class ConformanceFailure extends Schema.TaggedError<ConformanceFailure>(
  "effect/chat/ChatTest/ConformanceFailure"
)("ConformanceFailure", {
  rule: Schema.String,
  expected: Schema.String,
  actual: Schema.String,
  cause: Schema.optionalKey(Schema.Defect())
}) {
  override get message(): string {
    return this.rule + ": expected " + this.expected + ", got " + this.actual
  }
}

const sameMentions = (a: ReadonlyArray<Mention>, b: ReadonlyArray<Mention>): boolean =>
  a.length === b.length &&
  a.every((mention, i) => {
    const other = b[i]
    return mention.kind === other.kind && mention.id === other.id && mention.start === other.start &&
      mention.end === other.end && mention.isSelf === other.isSelf
  })

const sameReplyTo = (a: ReplyTo | undefined, b: ReplyTo | undefined): boolean =>
  a === undefined || b === undefined
    ? a === b
    : a.messageId === b.messageId && a.authorId === b.authorId

/**
 * Returns whether two reads of a message are the same message.
 *
 * **Details**
 *
 * It compares \`id\`, \`thread\`, \`author.id\`, \`author.isBot\`, \`author.isSelf\`,
 * \`text\`, \`mentions\`, \`replyTo\`, \`timestamp\` and the attachment ids in order.
 * \`raw\`, \`author.name\` and the optional attachment fields are left out.
 *
 * @stability unstable
 * @category comparisons
 * @since 4.1.5
 */
export const sameMessage = (a: ChatMessage.ChatMessage, b: ChatMessage.ChatMessage): boolean =>
  a.id === b.id &&
  ChatThread.equals(a.thread, b.thread) &&
  a.author.id === b.author.id &&
  a.author.isBot === b.author.isBot &&
  a.author.isSelf === b.author.isSelf &&
  a.text === b.text &&
  sameMentions(a.mentions, b.mentions) &&
  sameReplyTo(a.replyTo, b.replyTo) &&
  DateTime.Equivalence(a.timestamp, b.timestamp) &&
  a.attachments.length === b.attachments.length &&
  a.attachments.every((attachment, i) => attachment.id === b.attachments[i].id)

const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v)

const failure = (rule: string, expected: string, actual: string, cause?: unknown) =>
  new ConformanceFailure({ rule, expected, actual, ...(cause === undefined ? {} : { cause }) })

const check = (rule: string, condition: boolean, expected: string, actual: () => string) =>
  condition ? Effect.void : Effect.fail(failure(rule, expected, actual()))

const MessageJson = Schema.toCodecJson(ChatMessage.ChatMessage)
const EventJson = Schema.toCodecJson(ChatEvent.ChatEvent)

const roundTrip = <S extends Schema.Codec<any, Schema.Json>>(rule: string, codec: S, value: S["Type"]) =>
  Effect.gen(function*() {
    const encoded = yield* Schema.encodeEffect(codec)(value)
    const decoded = yield* Schema.decodeEffect(codec)(encoded)
    const again = yield* Schema.encodeEffect(codec)(decoded)
    yield* check(
      rule,
      canonicalJson(encoded) === canonicalJson(again),
      "an unchanged value after encoding and decoding",
      () => canonicalJson(again)
    )
    return decoded as S["Type"]
  }).pipe(
    Effect.catchTag(
      "SchemaError",
      (error) => Effect.fail(failure(rule, "a value that encodes and decodes", "SchemaError", error))
    )
  )

const checkThread = Effect.fnUntraced(function*(rule: string, thread: ChatThread.ChatThread, platform: string) {
  yield* check(rule, thread.platform === platform, "platform " + platform, () => "platform " + thread.platform)
  const decoded = ChatThread.fromString(ChatThread.toString(thread))
  yield* check(
    rule,
    Option.isSome(decoded) && ChatThread.equals(decoded.value, thread),
    "a thread that survives its string codec",
    () => ChatThread.toString(thread)
  )
})

const checkMessageWith = Effect.fnUntraced(function*(rule: string, message: ChatMessage.ChatMessage, options: {
  readonly platform: string
  readonly parseMention: ParseMention
}) {
  yield* checkThread(rule, message.thread, options.platform)
  const mentions = [...message.mentions].sort((a, b) => a.start - b.start)
  let end = 0
  for (const mention of mentions) {
    yield* check(
      rule,
      mention.start >= end && mention.start < mention.end && mention.end <= message.text.length,
      "mentions inside text without overlap",
      () => "mention at " + mention.start + "-" + mention.end
    )
    end = mention.end
    const parsed = options.parseMention(message.text.slice(mention.start, mention.end))
    yield* check(
      rule,
      Option.isSome(parsed) && parsed.value.kind === mention.kind && parsed.value.id === mention.id,
      "a " + mention.kind + " mention token at " + mention.start + "-" + mention.end,
      () => Option.isSome(parsed) ? "a " + parsed.value.kind + " token" : "no mention token"
    )
  }
  for (const attachment of message.attachments) {
    yield* check(
      rule,
      attachment.id.length > 0 && !("url" in attachment) && !/^[a-z]+:\/\//i.test(attachment.id),
      "an attachment with an id and no URL",
      () => "attachment " + (attachment.id.length > 0 ? "with a URL" : "without an id")
    )
  }
  const decoded = yield* roundTrip(rule, MessageJson, message)
  yield* check(rule, sameMessage(message, decoded), "the same message after decoding", () => "a different message")
})

/**
 * Checks the invariants every message holds, for fixture tests and live runs.
 *
 * **Details**
 *
 * - Every mention sits inside \`text\`, mentions do not overlap, and each slice
 *   parses with \`parseMention\` as a token of the mention's kind and id.
 * - \`thread.platform\` is the platform, and the thread survives its string
 *   codec.
 * - The message encodes and decodes through its Schema unchanged, \`raw\`
 *   included.
 * - Every attachment has an id and no URL.
 *
 * @stability unstable
 * @category testing
 * @since 4.1.5
 */
export const checkMessage = (message: ChatMessage.ChatMessage, options: {
  readonly platform: string
  readonly parseMention: ParseMention
}): Effect.Effect<void, ConformanceFailure> => checkMessageWith("checkMessage", message, options)

/**
 * Checks the invariants every event holds, for fixture tests and live runs.
 *
 * **Details**
 *
 * - A message event's message passes \`checkMessage\`, and the event's thread is
 *   the message's.
 * - \`thread.platform\` is the platform, and the thread survives its string
 *   codec.
 * - The event encodes and decodes through its Schema unchanged, \`raw\`
 *   included, and two decodes have the same \`dedupeKey\`.
 * - A reaction's \`dedupeKey\` differs between added and removed.
 *
 * @stability unstable
 * @category testing
 * @since 4.1.5
 */
export const checkEvent = (event: ChatEvent.ChatEvent, options: {
  readonly platform: string
  readonly parseMention: ParseMention
}): Effect.Effect<void, ConformanceFailure> =>
  Effect.gen(function*() {
    const rule = "checkEvent"
    yield* checkThread(rule, event.thread, options.platform)
    if (event._tag === "MessageCreated") {
      yield* checkMessageWith(rule, event.message, options)
      yield* check(
        rule,
        ChatThread.equals(event.thread, event.message.thread),
        "the event's thread equal to the message's",
        () => ChatThread.toString(event.thread)
      )
    } else {
      const { _tag, ...fields } = event
      const flipped = _tag === "ReactionAdded"
        ? ChatEvent.ReactionRemoved.make(fields)
        : ChatEvent.ReactionAdded.make(fields)
      yield* check(
        rule,
        ChatEvent.dedupeKey(flipped) !== ChatEvent.dedupeKey(event),
        "different keys for an added and a removed reaction",
        () => ChatEvent.dedupeKey(event)
      )
    }
    const first = yield* roundTrip(rule, EventJson, event)
    const second = yield* roundTrip(rule, EventJson, event)
    const key = ChatEvent.dedupeKey(event)
    yield* check(
      rule,
      ChatEvent.dedupeKey(first) === key && ChatEvent.dedupeKey(second) === key,
      "the same dedupeKey for every decode",
      () => ChatEvent.dedupeKey(first) + " and " + ChatEvent.dedupeKey(second)
    )
  })

// -----------------------------------------------------------------------------
// conformance
// -----------------------------------------------------------------------------

const describeExit = (exit: Exit.Exit<unknown, unknown>): string => {
  if (Exit.isSuccess(exit)) return "success"
  const error = Exit.findErrorOption(exit)
  if (Option.isNone(error)) return "a defect or interruption"
  return describeError(error.value)
}

const describeError = (error: unknown): string => {
  if (!isChatError(error)) return String(error)
  return error.reason._tag === "Unsupported"
    ? "Unsupported(" + error.reason.capability + ")"
    : error.reason._tag
}

const conformanceText = (rule: string) => "conformance " + rule

class Tester {
  readonly created: Array<{ readonly thread: ChatThread.ChatThread; readonly id: string }> = []
  readonly rule: string
  readonly chat: Chat.Chat["Service"]
  readonly descriptor: Descriptor
  readonly options: ConformanceOptions
  constructor(rule: string, chat: Chat.Chat["Service"], descriptor: Descriptor, options: ConformanceOptions) {
    this.rule = rule
    this.chat = chat
    this.descriptor = descriptor
    this.options = options
  }

  get thread() {
    return this.options.thread
  }

  has(capability: Capability) {
    return this.descriptor.capabilities.has(capability)
  }

  call<A>(effect: Effect.Effect<A, ChatError>): Effect.Effect<A, ConformanceFailure> {
    return Effect.mapError(effect, (error) => {
      const listed = error.reason._tag === "Unsupported" && this.has(error.reason.capability)
      return failure(
        this.rule,
        "success",
        describeError(error) + (listed ? " for a listed capability" : ""),
        error
      )
    })
  }

  collect<A>(stream: Stream.Stream<A, ChatError>): Effect.Effect<Array<A>, ConformanceFailure> {
    return this.call(Stream.runCollect(stream))
  }

  check(condition: boolean, expected: string, actual: () => string) {
    return check(this.rule, condition, expected, actual)
  }

  post(
    content: { readonly markdown?: string; readonly replyTo?: ReplyTo; readonly files?: ReadonlyArray<File> },
    thread = this.thread
  ) {
    return Effect.tap(
      this.call(this.chat.post(thread, { markdown: conformanceText(this.rule), ...content })),
      (posted) => Effect.sync(() => this.created.push({ thread, id: posted.id }))
    )
  }

  userPosts(thread = this.thread) {
    return Effect.flatMap(
      this.options.userPosts(thread, conformanceText(this.rule)),
      (event) =>
        event._tag === "MessageCreated"
          ? Effect.succeed(event)
          : Effect.fail(failure(this.rule, "a MessageCreated event from userPosts", event._tag))
    )
  }

  expectReason<A>(
    tag: ChatErrorReason["_tag"],
    effect: Effect.Effect<A, ChatError>,
    onSuccess?: (a: A) => void
  ): Effect.Effect<void, ConformanceFailure> {
    return Effect.flatMap(Effect.exit(effect), (exit) => {
      if (Exit.isSuccess(exit)) onSuccess?.(exit.value)
      const error = Exit.findErrorOption(exit)
      const matches = Option.isSome(error) && isChatError(error.value) && error.value.reason._tag === tag
      return matches ? Effect.void : Effect.fail(failure(
        this.rule,
        tag,
        describeExit(exit),
        Option.getOrUndefined(error)
      ))
    })
  }

  expectUnsupported(capability: Capability): Effect.Effect<void, ConformanceFailure, Registry> {
    const expected = "Unsupported(" + capability + ")"
    const expect = <A>(effect: Effect.Effect<A, ChatError>, onSuccess?: (a: A) => void) =>
      Effect.flatMap(Effect.exit(effect), (exit) => {
        if (Exit.isSuccess(exit)) onSuccess?.(exit.value)
        const error = Exit.findErrorOption(exit)
        const matches = Option.isSome(error) && isChatError(error.value) &&
          error.value.reason._tag === "Unsupported" && error.value.reason.capability === capability
        return matches ? Effect.void : Effect.fail(failure(
          this.rule,
          expected,
          describeExit(exit),
          Option.getOrUndefined(error)
        ))
      })
    const track = (posted: Posted) => void this.created.push({ thread: this.thread, id: posted.id })
    const { chat, thread } = this
    const text = conformanceText(this.rule)
    switch (capability) {
      case "edit":
        return Effect.flatMap(this.post({}), (posted) => expect(chat.edit(thread, posted.id, { markdown: text })))
      case "delete":
        return Effect.flatMap(this.post({}), (posted) => expect(chat.delete(thread, posted.id)))
      case "fetchMessage":
        return Effect.flatMap(this.post({}), (posted) => expect(chat.fetchMessage(thread, posted.id)))
      case "history":
        return expect(Stream.runDrain(Stream.take(chat.history(thread, { direction: "backward" }), 1)))
      case "download":
        return expect(Stream.runDrain(chat.download(thread, { id: "conformance-missing" }, { maxBytes: 1 })))
      case "files":
        return expect(chat.post(thread, { markdown: text, files: [conformanceFile(this.rule)] }), track)
      case "replyTo":
        return Effect.flatMap(
          this.post({}),
          (target) => expect(chat.post(thread, { markdown: text, replyTo: { messageId: target.id } }), track)
        )
      case "startThread":
        return Effect.flatMap(this.post({}), (posted) => expect(chat.startThread(thread, posted.id)))
      case "getThread":
        return expect(chat.getThread(thread))
      case "opener":
        return expect(chat.opener(thread))
      case "getUser":
        return Effect.flatMap(
          this.userPosts(),
          (event) => expect(chat.getUser(this.options.platform, event.message.author.id))
        )
      case "nativeStream":
        return Effect.flatMap(
          Registry,
          (registry) =>
            Effect.flatMap(this.call(registry.get(this.options.platform)), (adapter) =>
              this.check(
                adapter.nativeStream === undefined,
                "no nativeStream on an adapter whose descriptor lacks it",
                () => "a nativeStream"
              ))
        )
    }
  }

  get cleanup(): Effect.Effect<void> {
    return Effect.suspend(() => {
      if (!this.has("delete")) return Effect.void
      const created = this.created.splice(0).reverse()
      return Effect.forEach(created, ({ id, thread }) => Effect.ignore(this.chat.delete(thread, id)), {
        discard: true
      })
    })
  }
}

const conformanceFile = (rule: string): File => ({
  name: "conformance.txt",
  contentType: "text/plain",
  content: new TextEncoder().encode(conformanceText(rule) + " " + "x".repeat(64))
})

const findIn = (messages: ReadonlyArray<ChatMessage.ChatMessage>, id: string) =>
  messages.find((message) => message.id === id)

const mentionLike = "@everyone @here <@U0000> <!here> <!channel> <@&1> <#C0000>"

interface ConformanceOptions {
  readonly platform: string
  readonly thread: ChatThread.ChatThread
  readonly userPosts: (thread: ChatThread.ChatThread, text: string) => Effect.Effect<ChatEvent.ChatEvent>
  readonly parseMention: ParseMention
  readonly failNext?:
    | ((op: string, reason: ChatErrorReason, options?: {
      readonly times?: number | undefined
      readonly landed?: boolean | undefined
    }) => Effect.Effect<void>)
    | undefined
}

/**
 * Creates the conformance suite, as plain Effects keyed by rule name, so any
 * test runner can run them.
 *
 * **Details**
 *
 * - Each rule needs the adapter under test registered in \`Chat\` and a way to
 *   make another identity's message appear in \`thread\`, which must be a
 *   channel the suite may write to.
 * - A rule is never skipped. When the descriptor lacks a capability a rule
 *   needs, the rule becomes its inverse: the op fails with \`Unsupported\`.
 *   There is an \`unsupported/{capability}\` rule for every capability, which
 *   passes when the capability is listed.
 * - A listed capability never fails with \`Unsupported\`, which every rule
 *   checks as it goes.
 * - The three \`retries/*\` rules exist only when \`failNext\` is given.
 * - Every rule deletes what it posted when it ends, pass or fail, when the
 *   platform can delete.
 *
 * **Gotchas**
 *
 * The rules are provisional: they can be added, renamed, removed or tightened
 * in any release until the suite is frozen. The \`retries/retrySafe\` rule
 * waits for real time, so run the suite on a live \`Clock\`.
 *
 * @stability unstable
 * @category testing
 * @since 4.1.5
 */
export const conformance = (options: {
  readonly platform: string
  readonly thread: ChatThread.ChatThread
  readonly userPosts: (thread: ChatThread.ChatThread, text: string) => Effect.Effect<ChatEvent.ChatEvent>
  readonly parseMention: ParseMention
  readonly failNext?:
    | ((op: string, reason: ChatErrorReason, options?: {
      readonly times?: number | undefined
      readonly landed?: boolean | undefined
    }) => Effect.Effect<void>)
    | undefined
}): Readonly<Record<string, Effect.Effect<void, ConformanceFailure, Chat.Chat | Registry>>> => {
  const rules: Record<string, Effect.Effect<void, ConformanceFailure, Chat.Chat | Registry>> = {}
  const { parseMention, platform } = options

  const rule = (
    name: string,
    needs: ReadonlyArray<Capability>,
    body: (t: Tester) => Effect.Effect<void, ConformanceFailure, Registry>
  ) => {
    rules[name] = Effect.gen(function*() {
      const chat = yield* Chat.Chat
      const descriptor = yield* Effect.mapError(
        chat.descriptor(platform),
        (error) => failure(name, "a registered adapter", describeError(error), error)
      )
      const t = new Tester(name, chat, descriptor, options)
      const missing = needs.find((capability) => !t.has(capability))
      return yield* (missing === undefined ? body(t) : t.expectUnsupported(missing)).pipe(
        Effect.ensuring(t.cleanup)
      )
    })
  }

  rule("post/fetchable", ["fetchMessage"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({})
      const message = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(
        posted.id === message.id && ChatThread.equals(posted.thread, t.thread) &&
          ChatThread.equals(message.thread, t.thread),
        "the posted message, addressed to " + ChatThread.toString(t.thread),
        () => "message " + message.id + " in " + ChatThread.toString(message.thread)
      )
    }))

  rule("post/authorIsSelf", ["fetchMessage"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({})
      const message = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(
        message.author.isSelf && message.author.isBot,
        "author.isSelf and author.isBot",
        () => "isSelf " + message.author.isSelf + ", isBot " + message.author.isBot
      )
    }))

  rule("post/replyTo", ["replyTo", "fetchMessage"], (t) =>
    Effect.gen(function*() {
      const target = yield* t.post({})
      const reply = yield* t.post({ replyTo: { messageId: target.id } })
      const message = yield* t.call(t.chat.fetchMessage(t.thread, reply.id))
      yield* t.check(
        message.replyTo?.messageId === target.id,
        "replyTo " + target.id,
        () => "replyTo " + message.replyTo?.messageId
      )
    }))

  rule("post/files", ["files", "download", "fetchMessage"], (t) =>
    Effect.gen(function*() {
      const file = conformanceFile(t.rule)
      const posted = yield* t.post({ files: [file] })
      const message = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(message.attachments.length === 1, "one attachment", () => message.attachments.length + "")
      const chunks = yield* t.collect(
        t.chat.download(t.thread, message.attachments[0], { maxBytes: file.content.length })
      )
      const bytes = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.length, 0))
      chunks.reduce((offset, chunk) => (bytes.set(chunk, offset), offset + chunk.length), 0)
      yield* t.check(
        bytes.length === file.content.length && bytes.every((byte, i) => byte === file.content[i]),
        "the uploaded bytes",
        () => bytes.length + " different bytes"
      )
    }))

  rule("post/tooLarge", [], (t) =>
    t.expectReason(
      "TooLarge",
      t.chat.post(t.thread, { markdown: "x".repeat(t.descriptor.limits.messageLength + 1) }),
      (posted) => t.created.push({ thread: t.thread, id: posted.id })
    ))

  rule("post/noMentions", ["fetchMessage"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({ markdown: mentionLike })
      const message = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(message.mentions.length === 0, "no mentions", () => message.mentions.length + " mentions")
    }))

  const goneId = Effect.fnUntraced(function*(t: Tester) {
    const posted = yield* t.post({})
    if (!t.has("delete")) return posted.id + "0"
    yield* t.call(t.chat.delete(t.thread, posted.id))
    return posted.id
  })

  rule("edit/keepsId", ["edit", "fetchMessage"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({ markdown: conformanceText(t.rule) + " before" })
      const before = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.call(t.chat.edit(t.thread, posted.id, { markdown: conformanceText(t.rule) + " after" }))
      const after = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(
        after.id === posted.id && after.text !== before.text,
        "the same id with new text",
        () => "id " + after.id + (after.text === before.text ? " with the old text" : "")
      )
    }))

  rule("edit/unknownId", ["edit"], (t) =>
    Effect.flatMap(
      goneId(t),
      (id) => t.expectReason("NotFound", t.chat.edit(t.thread, id, { markdown: conformanceText(t.rule) }))
    ))

  rule("edit/tooLarge", ["edit"], (t) =>
    Effect.flatMap(t.post({}), (posted) =>
      t.expectReason(
        "TooLarge",
        t.chat.edit(t.thread, posted.id, { markdown: "x".repeat(t.descriptor.limits.messageLength + 1) })
      )))

  rule("delete/gone", ["delete", "fetchMessage"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({})
      yield* t.call(t.chat.delete(t.thread, posted.id))
      yield* t.expectReason("NotFound", t.chat.fetchMessage(t.thread, posted.id))
    }))

  rule(
    "delete/unknownId",
    ["delete"],
    (t) => Effect.flatMap(goneId(t), (id) => t.expectReason("NotFound", t.chat.delete(t.thread, id)))
  )

  rule("history/order", ["history"], (t) =>
    Effect.gen(function*() {
      const a = yield* t.post({ markdown: conformanceText(t.rule) + " a" })
      const b = yield* t.post({ markdown: conformanceText(t.rule) + " b" })
      const c = yield* t.post({ markdown: conformanceText(t.rule) + " c" })
      const backward = yield* t.collect(Stream.take(t.chat.history(t.thread, { direction: "backward" }), 3))
      const forward = yield* t.collect(
        Stream.take(t.chat.history(t.thread, { direction: "forward", from: a.id }), 2)
      )
      const ids = (messages: ReadonlyArray<ChatMessage.ChatMessage>) => messages.map((m) => m.id).join(",")
      yield* t.check(ids(backward) === [c.id, b.id, a.id].join(","), "backward " + [c.id, b.id, a.id], () =>
        "backward " + ids(backward))
      yield* t.check(ids(forward) === [b.id, c.id].join(","), "forward " + [b.id, c.id], () =>
        "forward " + ids(forward))
    }))

  rule("history/fromExclusive", ["history"], (t) =>
    Effect.gen(function*() {
      const a = yield* t.post({ markdown: conformanceText(t.rule) + " a" })
      const b = yield* t.post({ markdown: conformanceText(t.rule) + " b" })
      const before = yield* t.collect(Stream.take(t.chat.history(t.thread, { direction: "backward", from: b.id }), 1))
      const after = yield* t.collect(Stream.take(t.chat.history(t.thread, { direction: "forward", from: a.id }), 1))
      yield* t.check(
        before[0]?.id === a.id && after[0]?.id === b.id,
        "the message next to from, not from itself",
        () => "backward " + before[0]?.id + ", forward " + after[0]?.id
      )
    }))

  rule("history/sameAsInbound", ["history"], (t) =>
    Effect.gen(function*() {
      const event = yield* t.userPosts()
      const history = yield* t.collect(Stream.take(t.chat.history(t.thread, { direction: "backward" }), 20))
      const read = findIn(history, event.message.id)
      yield* t.check(
        read !== undefined && sameMessage(event.message, read),
        "the inbound message in history",
        () => read === undefined ? "no such message" : "a different message"
      )
    }))

  rule("history/startsWithOpener", ["history", "startThread"], (t) =>
    Effect.gen(function*() {
      const opener = yield* t.post({ markdown: conformanceText(t.rule) + " opener" })
      const thread = yield* t.call(t.chat.startThread(t.thread, opener.id, { name: conformanceText(t.rule) }))
      yield* t.post({ markdown: conformanceText(t.rule) + " reply" }, thread)
      const first = yield* t.collect(Stream.take(t.chat.history(thread, { direction: "forward" }), 1))
      yield* t.check(
        first[0]?.id === opener.id && ChatThread.equals(first[0].thread, t.thread),
        "the opener first, addressed to " + ChatThread.toString(t.thread),
        () =>
          first[0] === undefined
            ? "an empty history"
            : "message " + first[0].id + " in " + ChatThread.toString(first[0].thread)
      )
    }))

  rule("message/threadStable", ["fetchMessage", "history", "startThread"], (t) =>
    Effect.gen(function*() {
      const event = yield* t.userPosts()
      const id = event.message.id
      const read = Effect.gen(function*() {
        const fetched = yield* t.call(t.chat.fetchMessage(t.thread, id))
        const history = yield* t.collect(Stream.take(t.chat.history(t.thread, { direction: "backward" }), 20))
        return [fetched, findIn(history, id)] as const
      })
      const before = yield* read
      const thread = yield* t.call(t.chat.startThread(t.thread, id, { name: conformanceText(t.rule) }))
      yield* t.post({ markdown: conformanceText(t.rule) + " reply" }, thread)
      const after = yield* read
      const reads = [event.message, ...before, ...after]
      yield* t.check(
        reads.every((message) => message !== undefined && ChatThread.equals(message.thread, t.thread)),
        "every read addressed to " + ChatThread.toString(t.thread),
        () => reads.map((message) => message === undefined ? "missing" : ChatThread.toString(message.thread)).join(", ")
      )
    }))

  rule("inbound/fetchable", ["fetchMessage"], (t) =>
    Effect.gen(function*() {
      const event = yield* t.userPosts()
      const message = yield* t.call(t.chat.fetchMessage(event.thread, event.message.id))
      yield* t.check(sameMessage(event.message, message), "the inbound message", () => "a different message")
    }))

  rule("inbound/notSelf", [], (t) =>
    Effect.gen(function*() {
      const event = yield* t.userPosts()
      yield* t.check(!event.message.author.isSelf, "author.isSelf false", () => "author.isSelf true")
      yield* checkEvent(event, { platform, parseMention }).pipe(
        Effect.mapError((error) => failure(t.rule, error.expected, error.actual, error.cause))
      )
    }))

  rule("download/maxBytes", ["files", "download", "fetchMessage"], (t) =>
    Effect.gen(function*() {
      const file = conformanceFile(t.rule)
      const posted = yield* t.post({ files: [file] })
      const message = yield* t.call(t.chat.fetchMessage(t.thread, posted.id))
      yield* t.check(message.attachments.length === 1, "one attachment", () => message.attachments.length + "")
      yield* t.expectReason(
        "TooLarge",
        Stream.runDrain(t.chat.download(t.thread, message.attachments[0], { maxBytes: 8 }))
      )
    }))

  rule("startThread/idempotent", ["startThread"], (t) =>
    Effect.gen(function*() {
      const posted = yield* t.post({})
      const first = yield* t.call(t.chat.startThread(t.thread, posted.id, { name: conformanceText(t.rule) }))
      const second = yield* t.call(t.chat.startThread(t.thread, posted.id))
      yield* t.check(
        ChatThread.equals(first, second),
        ChatThread.toString(first),
        () => ChatThread.toString(second)
      )
    }))

  rule("opener/noneOutsideThread", ["opener"], (t) =>
    Effect.flatMap(
      t.call(t.chat.opener(t.thread)),
      (opener) => t.check(Option.isNone(opener), "no opener", () => "an opener")
    ))

  for (const capability of [...allCapabilities, "nativeStream" as const]) {
    rule("unsupported/" + capability, [], (t) => t.has(capability) ? Effect.void : t.expectUnsupported(capability))
  }

  const failNext = options.failNext
  if (failNext !== undefined) {
    rule("retries/noneWithoutRetries", [], (t) =>
      Effect.gen(function*() {
        yield* failNext("post", new RateLimited({}))
        yield* t.expectReason(
          "RateLimited",
          Chat.withoutRetries(t.chat.post(t.thread, { markdown: conformanceText(t.rule) })),
          (posted) => t.created.push({ thread: t.thread, id: posted.id })
        )
      }))

    rule("retries/retrySafe", [], (t) =>
      Effect.gen(function*() {
        const retryAfter = Duration.millis(100)
        yield* failNext("post", new RateLimited({ retryAfter }))
        const start = yield* DateTime.now
        yield* t.post({})
        const elapsed = DateTime.distance(start, yield* DateTime.now)
        yield* t.check(
          Duration.isGreaterThanOrEqualTo(elapsed, retryAfter),
          "a retry after " + Duration.format(retryAfter),
          () => "a retry after " + Duration.format(elapsed)
        )
      }))

    rule("retries/neverUncertain", [], (t) =>
      Effect.gen(function*() {
        yield* failNext("post", new Transport({ retry: "uncertain" }), { landed: true })
        yield* t.expectReason(
          "Transport",
          t.chat.post(t.thread, { markdown: conformanceText(t.rule) }),
          (posted) => t.created.push({ thread: t.thread, id: posted.id })
        )
      }))
  }

  return rules
}
