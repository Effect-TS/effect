import type { DiscordREST } from "dfx/DiscordREST"
import * as Cache from "effect/Cache"
import {
  type ChatAdapter,
  checkMessageLength,
  type Descriptor,
  type File,
  type Posted,
  retrySafe,
  type ThreadInfo,
  type User
} from "effect/chat/ChatAdapter"
import { type ChatError, type ChatErrorReason, TooLarge, Unsupported } from "effect/chat/ChatError"
import type { ChatMessage } from "effect/chat/ChatMessage"
import type * as ChatThread from "effect/chat/ChatThread"
import type { Action } from "effect/chat/ChatUi"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Errors from "./errors.ts"
import * as Length from "./length.ts"
import * as Normalize from "./normalize.ts"
import { allowedMentions, CurrentPostOptions, flags } from "./options.ts"

type Json = Schema.Json
type Rest = DiscordREST["Service"]

/** @internal */
export const descriptor: Descriptor = {
  platform: Normalize.platform,
  capabilities: new Set([
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
  ]),
  measure: Length.codePoints,
  limits: {
    messageLength: Length.messageLength,
    filesPerMessage: 10,
    uploadBytes: 10 * 1024 * 1024,
    minWriteInterval: Duration.millis(1500)
  }
}

const pageSize = 100

/** Discord's code for "a thread has already been created for this message". */
const THREAD_ALREADY_CREATED = 160004
/** Discord's code for "cannot execute action on this channel type". */
const WRONG_CHANNEL_TYPE = 50024

const optional = <S extends Schema.Top>(schema: S) => Schema.optionalKey(Schema.NullOr(schema))

const ChannelFields = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  guild_id: optional(Schema.String),
  parent_id: optional(Schema.String),
  name: optional(Schema.String),
  topic: optional(Schema.String),
  thread_metadata: optional(Schema.Struct({ create_timestamp: optional(Schema.String) }))
})

/**
 * What the adapter reads from a channel.
 *
 * @internal
 */
export type Channel = typeof ChannelFields.Type & { readonly raw: Json }

const decodeChannel = Schema.decodeUnknownOption(ChannelFields)

const UserFields = Schema.Struct({
  id: Schema.String,
  username: optional(Schema.String),
  global_name: optional(Schema.String),
  bot: optional(Schema.Boolean)
})

const decodeUser = Schema.decodeUnknownOption(UserFields)

const MemberFields = Schema.Struct({ nick: optional(Schema.String), user: optional(UserFields) })

const decodeMember = Schema.decodeUnknownOption(MemberFields)

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value === "" ? undefined : value

const isObject = (u: unknown): u is Record<string, Json> => typeof u === "object" && u !== null && !Array.isArray(u)

const snowflake = /^\d{1,20}$/

/** @internal */
export const make = Effect.fnUntraced(function*(options: {
  readonly rest: Rest
  readonly http: HttpClient.HttpClient
  readonly botUserId: Effect.Effect<string, ChatError>
}) {
  const { rest } = options

  const fail = (op: string, reason: ChatErrorReason) => Effect.fail(Errors.chatError(op, reason))

  /** The descriptor lists no buttons or selects yet, so a write that carries them is refused, never sent without them. */
  const refuseActions = (op: string, actions: ReadonlyArray<Action> | undefined) =>
    actions === undefined || actions.length === 0 ? Effect.void : fail(
      op,
      new Unsupported({ capability: actions.some((action) => action._tag !== "Select") ? "buttons" : "selects" })
    )

  /** One REST call, its failure mapped to a `ChatError` and retried when nothing happened. */
  const call = <A, E>(op: string, effect: Effect.Effect<A, E>, write = false): Effect.Effect<A, ChatError> =>
    retrySafe(Effect.mapError(effect, (error) => Errors.chatError(op, Errors.reasonForRestError(error, { write }))))

  const resolve = (op: string, thread: ChatThread.ChatThread): Effect.Effect<string, ChatError> =>
    thread.platform === Normalize.platform && snowflake.test(thread.id)
      ? Effect.succeed(thread.id)
      : fail(op, Errors.invalidRequest("invalid_thread"))

  const readChannel = (op: string, raw: unknown): Effect.Effect<Channel, ChatError> =>
    Option.match(decodeChannel(raw), {
      onNone: () => fail(op, Errors.invalidResponse(false, "invalid_channel")),
      onSome: (fields) => Effect.succeed({ ...fields, raw: raw as Json })
    })

  /** Channels by id, for their type, parent and guild, none of which change. Failures are not kept. */
  const channels = yield* Cache.makeWith(
    (id: string) => Effect.flatMap(call("getChannel", rest.getChannel(id)), (raw) => readChannel("getChannel", raw)),
    {
      capacity: 1024,
      timeToLive: (exit) => Exit.isSuccess(exit) ? Duration.hours(1) : Duration.zero
    }
  )

  const channel = (op: string, id: string): Effect.Effect<Channel, ChatError> =>
    Cache.get(channels, id).pipe(
      Effect.mapError((error) => error.op === op ? error : Errors.chatError(op, error.reason))
    )

  const toMessage = (raw: unknown, botUserId: string): ChatMessage | undefined => {
    const fields = Normalize.decodeMessageFields(raw)
    return fields === undefined ? undefined : Normalize.message(raw as Json, fields, { botUserId })
  }

  const getMessage = (op: string, channelId: string, messageId: string): Effect.Effect<Json, ChatError> =>
    call(op, rest.getMessage(channelId, messageId)).pipe(Effect.map((raw) => raw as unknown as Json))

  const fetchMessage = Effect.fnUntraced(function*(op: string, thread: ChatThread.ChatThread, messageId: string) {
    const channelId = yield* resolve(op, thread)
    const botUserId = yield* options.botUserId
    const raw = yield* getMessage(op, channelId, messageId)
    const message = toMessage(raw, botUserId)
    return message === undefined ? yield* fail(op, Errors.notFound("not_a_message")) : message
  })

  /** An optional read: none when the message is gone or the bot may not read it. */
  const orNone = <A>(effect: Effect.Effect<A, ChatError>): Effect.Effect<Option.Option<A>, ChatError> =>
    effect.pipe(
      Effect.map(Option.some),
      Effect.catchIf(
        (error) => error.reason._tag === "NotFound" || error.reason._tag === "Forbidden",
        () => Effect.succeed(Option.none())
      )
    )

  // Writes

  const toFile = (file: File) =>
    new globalThis.File([file.content as Uint8Array<ArrayBuffer>], file.name, { type: file.contentType })

  const post: ChatAdapter["post"] = Effect.fnUntraced(function*(thread, content) {
    const op = "post"
    const channelId = yield* resolve(op, thread)
    yield* refuseActions(op, content.actions)
    const postOptions = yield* CurrentPostOptions
    yield* checkMessageLength(descriptor, op, content.markdown)
    const files = content.files ?? []
    if (files.length > descriptor.limits.filesPerMessage) {
      return yield* fail(op, new TooLarge({ subject: "files", detail: "too_many_files" }))
    }
    if (files.reduce((total, file) => total + file.content.length, 0) > descriptor.limits.uploadBytes) {
      return yield* fail(op, new TooLarge({ subject: "files", detail: "upload_too_large" }))
    }
    const create = rest.createMessage(channelId, {
      content: content.markdown,
      allowed_mentions: allowedMentions(postOptions.notify),
      flags: flags(postOptions),
      ...(content.replyTo === undefined ? {} : { message_reference: { message_id: content.replyTo.messageId } }),
      ...(files.length === 0 ? {} : { attachments: files.map((file, i) => ({ id: String(i), filename: file.name })) })
    })
    const answer = yield* call(op, files.length === 0 ? create : rest.withFiles(files.map(toFile))(create), true)
    if (typeof answer.id !== "string" || typeof answer.timestamp !== "string") {
      return yield* fail(op, Errors.invalidResponse(true, "missing_id"))
    }
    const timestamp = DateTime.make(answer.timestamp)
    if (Option.isNone(timestamp)) return yield* fail(op, Errors.invalidResponse(true, "invalid_timestamp"))
    return { id: answer.id, thread, timestamp: DateTime.toUtc(timestamp.value) } satisfies Posted
  })

  const edit: ChatAdapter["edit"] = Effect.fnUntraced(function*(thread, messageId, content) {
    const op = "edit"
    const channelId = yield* resolve(op, thread)
    yield* refuseActions(op, content.actions)
    const postOptions = yield* CurrentPostOptions
    yield* checkMessageLength(descriptor, op, content.markdown)
    yield* call(
      op,
      rest.updateMessage(channelId, messageId, {
        content: content.markdown,
        allowed_mentions: allowedMentions(postOptions.notify),
        flags: flags(postOptions)
      }),
      true
    )
  })

  const startThread: ChatAdapter["startThread"] = Effect.fnUntraced(function*(thread, messageId, startOptions) {
    const op = "startThread"
    const channelId = yield* resolve(op, thread)
    const postOptions = yield* CurrentPostOptions
    const given = nonEmpty(startOptions?.name?.trim())
    const name = given ?? (yield* Effect.map(
      getMessage(op, channelId, messageId),
      (raw) => {
        const text = isObject(raw) && typeof raw.content === "string" ? raw.content.replace(/\s+/g, " ").trim() : ""
        return text === "" ? "Thread" : Length.cut(text, 100)
      }
    ))
    return yield* call(
      op,
      rest.createThreadFromMessage(channelId, messageId, {
        name: Length.cut(name, 100),
        ...(postOptions.autoArchiveDuration === undefined
          ? {}
          : { auto_archive_duration: postOptions.autoArchiveDuration })
      }),
      true
    ).pipe(
      Effect.map((answer) => Normalize.thread(typeof answer.id === "string" ? answer.id : messageId)),
      // The thread under a message has the message's id.
      Effect.catchIf(Errors.hasCode(THREAD_ALREADY_CREATED), () => Effect.succeed(Normalize.thread(messageId))),
      // A message in a thread has no thread of its own: the thread is the answer.
      Effect.catchIf(Errors.hasCode(WRONG_CHANNEL_TYPE), (error) =>
        Effect.flatMap(
          channel(op, channelId),
          (found) => Normalize.isThreadType(found.type) ? Effect.succeed(thread) : Effect.fail(error)
        ))
    )
  })

  // Reads

  /**
   * A thread's messages, with the `THREAD_STARTER_MESSAGE` placeholder
   * replaced by the opener from the parent channel, or dropped when the
   * opener is gone.
   */
  const history: ChatAdapter["history"] = (thread, { direction, from }) =>
    Stream.unwrap(Effect.gen(function*() {
      const op = "history"
      const channelId = yield* resolve(op, thread)
      const botUserId = yield* options.botUserId
      const page = (cursor: string | undefined) =>
        call(
          op,
          rest.listMessages(
            channelId,
            direction === "backward"
              ? { ...(cursor === undefined ? {} : { before: cursor }), limit: pageSize }
              : { after: cursor ?? "0", limit: pageSize }
          )
        ).pipe(Effect.map((answer) => {
          const found: ReadonlyArray<Json> = Array.isArray(answer) ? answer as ReadonlyArray<Json> : []
          const sorted = [...found].sort((a, b) =>
            Normalize.compareIds(idOf(a), idOf(b)) * (direction === "backward" ? -1 : 1)
          )
          const last = sorted.at(-1)
          return [
            sorted,
            found.length < pageSize || last === undefined ? Option.none<string>() : Option.some(idOf(last))
          ] as const
        }))
      const after = (message: ChatMessage) =>
        from === undefined ||
        (direction === "forward"
          ? Normalize.compareIds(message.id, from) > 0
          : Normalize.compareIds(message.id, from) < 0)
      return Stream.paginate(from, page).pipe(
        Stream.mapEffect((raw) => resolveStarter(op, raw, botUserId)),
        Stream.filter((message): message is ChatMessage => message !== undefined && after(message))
      )
    }))

  const idOf = (raw: Json): string => isObject(raw) && typeof raw.id === "string" ? raw.id : ""

  const resolveStarter = (
    op: string,
    raw: Json,
    botUserId: string
  ): Effect.Effect<ChatMessage | undefined, ChatError> => {
    const fields = Normalize.decodeMessageFields(raw)
    if (fields === undefined) return Effect.succeed(undefined)
    if (fields.type !== Normalize.THREAD_STARTER_MESSAGE) {
      return Effect.succeed(Normalize.message(raw, fields, { botUserId }))
    }
    const referenced = isObject(raw) ? raw.referenced_message : undefined
    if (referenced === null) return Effect.succeed(undefined)
    if (referenced !== undefined) return Effect.succeed(toMessage(referenced, botUserId))
    const reference = fields.message_reference
    const channelId = nonEmpty(reference?.channel_id)
    const messageId = nonEmpty(reference?.message_id)
    if (channelId === undefined || messageId === undefined) return Effect.succeed(undefined)
    return orNone(getMessage(op, channelId, messageId)).pipe(
      Effect.map((found) => Option.isSome(found) ? toMessage(found.value, botUserId) : undefined)
    )
  }

  /**
   * The message whose id is the thread's: in the thread for a forum post,
   * otherwise in the parent channel.
   */
  const opener: ChatAdapter["opener"] = Effect.fnUntraced(function*(thread) {
    const op = "opener"
    const channelId = yield* resolve(op, thread)
    const found = yield* channel(op, channelId)
    if (!Normalize.isThreadType(found.type)) return Option.none()
    const botUserId = yield* options.botUserId
    const inThread = yield* orNone(getMessage(op, channelId, channelId))
    const parent = nonEmpty(found.parent_id)
    const raw = Option.isSome(inThread) || parent === undefined
      ? inThread
      : yield* orNone(getMessage(op, parent, channelId))
    return Option.flatMap(raw, (raw) => Option.fromUndefinedOr(toMessage(raw, botUserId)))
  })

  const getThread: ChatAdapter["getThread"] = Effect.fnUntraced(function*(thread) {
    const op = "getThread"
    const channelId = yield* resolve(op, thread)
    const found = yield* Effect.flatMap(call(op, rest.getChannel(channelId)), (raw) => readChannel(op, raw))
    const kind = Normalize.kindOf(found.type)
    const name = kind === "direct" ? undefined : nonEmpty(found.name)
    const topic = nonEmpty(found.topic)
    const parent = kind === "thread" ? nonEmpty(found.parent_id) : undefined
    // An unreadable creation time falls back to the id's.
    const created = Option.flatMap(
      Option.fromUndefinedOr(nonEmpty(found.thread_metadata?.create_timestamp)),
      DateTime.make
    )
    const createdAt = Option.isSome(created) ? DateTime.toUtc(created.value) : Normalize.snowflakeTime(found.id)
    return {
      thread,
      kind,
      ...(name === undefined ? {} : { name }),
      ...(topic === undefined ? {} : { topic }),
      ...(parent === undefined ? {} : { parent: Normalize.thread(parent) }),
      ...(createdAt === undefined ? {} : { createdAt }),
      raw: found.raw
    } satisfies ThreadInfo
  })

  const getUser: ChatAdapter["getUser"] = Effect.fnUntraced(function*(id, userOptions) {
    const op = "getUser"
    const botUserId = yield* options.botUserId
    const where = userOptions?.in
    const guildId = where === undefined
      ? undefined
      : nonEmpty((yield* channel(op, yield* resolve(op, where))).guild_id)
    if (guildId !== undefined) {
      const member = yield* orNone(call(op, rest.getGuildMember(guildId, id)))
      if (Option.isSome(member)) {
        const fields = Option.getOrUndefined(decodeMember(member.value))
        const user = fields?.user
        if (fields !== undefined && user !== null && user !== undefined) {
          return {
            id: user.id,
            name: nonEmpty(fields.nick) ?? nonEmpty(user.global_name) ?? nonEmpty(user.username) ?? user.id,
            isBot: user.bot === true,
            isSelf: user.id === botUserId,
            raw: member.value as unknown as Json
          } satisfies User
        }
      }
    }
    const raw = yield* call(op, rest.getUser(id))
    const user = Option.getOrUndefined(decodeUser(raw))
    if (user === undefined) return yield* fail(op, Errors.invalidResponse(false, "invalid_user"))
    return {
      id: user.id,
      name: nonEmpty(user.global_name) ?? nonEmpty(user.username) ?? user.id,
      isBot: user.bot === true,
      isSelf: user.id === botUserId,
      raw: raw as unknown as Json
    } satisfies User
  })

  const download: ChatAdapter["download"] = (thread, attachment, { maxBytes }) =>
    Stream.unwrap(Effect.gen(function*() {
      const op = "download"
      const channelId = yield* resolve(op, thread)
      const tooLarge = Errors.chatError(op, new TooLarge({ subject: "files", detail: "max_bytes" }))
      if (attachment.size !== undefined && attachment.size > maxBytes) return yield* Effect.fail(tooLarge)
      const ids = Normalize.parseAttachmentId(attachment.id)
      if (ids === undefined) return yield* fail(op, Errors.invalidRequest("invalid_attachment"))
      const raw = yield* getMessage(op, channelId, ids.messageId)
      const list = isObject(raw) && Array.isArray(raw.attachments) ? raw.attachments : []
      const found = list.find((item) => isObject(item) && item.id === ids.attachmentId)
      const url = isObject(found) && typeof found.url === "string" ? found.url : undefined
      if (url === undefined) return yield* fail(op, Errors.notFound("attachment_not_found"))
      const response = yield* options.http.execute(HttpClientRequest.get(url)).pipe(
        Effect.mapError((error) => Errors.chatError(op, Errors.transport(false, error.reason._tag, error)))
      )
      if (response.status < 200 || response.status >= 300) {
        return yield* fail(op, Errors.reasonForResponse(response.status, undefined, { write: false }))
      }
      let received = 0
      return response.stream.pipe(
        Stream.mapError((error) => Errors.chatError(op, Errors.transport(false, error.reason._tag, error))),
        Stream.mapEffect((chunk) => {
          received += chunk.length
          return received > maxBytes ? Effect.fail(tooLarge) : Effect.succeed(chunk)
        })
      )
    }))

  const adapter: ChatAdapter = {
    descriptor,
    post,
    edit,
    delete: Effect.fnUntraced(function*(thread, messageId) {
      const channelId = yield* resolve("delete", thread)
      yield* call("delete", rest.deleteMessage(channelId, messageId), true)
    }),
    fetchMessage: (thread, messageId) => fetchMessage("fetchMessage", thread, messageId),
    history,
    download,
    startThread,
    getThread,
    opener,
    getUser
  }

  /** The guild a channel or thread is in, from the cached channel. */
  const guild = (thread: ChatThread.ChatThread): Effect.Effect<Option.Option<string>, ChatError> =>
    Effect.flatMap(
      resolve("guild", thread),
      (id) => Effect.map(channel("guild", id), (found) => Option.fromUndefinedOr(nonEmpty(found.guild_id)))
    )

  /** A channel's type, for `dispatch`. */
  const channelType = (id: string): Effect.Effect<number, ChatError> =>
    Effect.map(channel("dispatch", id), (found) => found.type)

  return { adapter, guild, channelType }
})
