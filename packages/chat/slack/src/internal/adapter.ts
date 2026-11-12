import {
  type ChatAdapter,
  type Descriptor,
  type File,
  type Posted,
  retrySafe,
  type ThreadInfo
} from "effect/chat/ChatAdapter"
import { type ChatError, type ChatErrorReason, TooLarge, Unknown, Unsupported } from "effect/chat/ChatError"
import type { ChatMessage } from "effect/chat/ChatMessage"
import type { ChatThread } from "effect/chat/ChatThread"
import * as Clock from "effect/Clock"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Address from "./address.ts"
import * as Errors from "./errors.ts"
import * as Escape from "./escape.ts"
import * as Length from "./length.ts"
import * as Normalize from "./normalize.ts"
import { CurrentPostOptions, type SessionStatus } from "./options.ts"

type Json = Schema.Json
type JsonObject = { readonly [key: string]: Json }

const isObject = (u: unknown): u is JsonObject => typeof u === "object" && u !== null && !Array.isArray(u)

const string = (object: JsonObject, key: string): string | undefined => {
  const value = object[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const object = (object: JsonObject, key: string): JsonObject | undefined => {
  const value = object[key]
  return isObject(value) ? value : undefined
}

/** @internal */
export interface Api {
  readonly call: (
    method: string,
    body: Readonly<Record<string, unknown>>,
    options?: { readonly write?: boolean | undefined; readonly retry?: boolean | undefined }
  ) => Effect.Effect<Json, ChatError>
}

/** @internal */
export interface SlackUser {
  readonly id: string
  readonly teamId: string
  readonly name: string
  readonly isBot: boolean
  readonly isRestricted: boolean
  readonly isUltraRestricted: boolean
  readonly isStranger: boolean
  readonly deleted: boolean
  readonly raw: Json
}

/** @internal */
export const descriptor: Descriptor = {
  platform: Address.platform,
  capabilities: new Set([
    "edit",
    "delete",
    "fetchMessage",
    "history",
    "download",
    "files",
    "startThread",
    "getThread",
    "opener",
    "getUser",
    "nativeStream"
  ]),
  measure: Length.measure,
  limits: {
    messageLength: Length.messageLength,
    filesPerMessage: 10,
    uploadBytes: 1024 * 1024 * 1024,
    minWriteInterval: Duration.seconds(1),
    streamLength: Length.messageLength,
    streamAge: Duration.minutes(10)
  }
}

const pageSize = 200

/** `files.info` reads for the share of a fresh upload, at this interval. */
const shareAttempts = 20
const shareInterval = Duration.millis(500)

/** Codes on `chat.startStream` that mean the feature is off for this thread. */
const streamUnsupported = new Set(["channel_type_not_supported", "feature_disabled", "not_allowed_token_type"])

/** How long a message's pace is kept after its last write. */
const paceIdleMillis = 15 * 60 * 1000

interface Pace {
  readonly intervalMillis: number
  readonly nextAt: number
}

interface StreamState {
  escape: Escape.State
  text: string
  stopped: boolean
}

const hasDetail = (code: string) => (error: ChatError): boolean => error.reason.detail === code

const userName = (user: JsonObject): string => {
  const profile = object(user, "profile")
  return (profile === undefined ? undefined : string(profile, "display_name") ?? string(profile, "real_name")) ??
    string(user, "real_name") ?? string(user, "name") ?? string(user, "id") ?? ""
}

/** @internal */
export const make = (options: {
  readonly api: Api
  readonly http: HttpClient.HttpClient
  readonly botToken: Redacted.Redacted
  readonly teamId: string
  readonly botUserId: Effect.Effect<string, ChatError>
}) => {
  const { api, teamId } = options
  const streams = new Map<string, StreamState>()
  let declaredAgent = true

  const fail = (op: string, reason: ChatErrorReason) => Effect.fail(Errors.chatError(op, reason))

  /**
   * Writes that grow one message: stream appends and edits. After a 429 on
   * a message, its next write waits for the retry-after, and each later
   * write waits twice the interval it waited before, for as long as the
   * reply goes on.
   */
  const paces = new Map<string, Pace>()
  const paced = <A>(messageId: string, write: Effect.Effect<A, ChatError>): Effect.Effect<A, ChatError> =>
    Effect.gen(function*() {
      const pace = paces.get(messageId)
      if (pace !== undefined) {
        const wait = pace.nextAt - (yield* Clock.currentTimeMillis)
        if (wait > 0) yield* Effect.sleep(Duration.millis(wait))
      }
      return yield* write.pipe(
        Effect.tap(() =>
          Effect.map(Clock.currentTimeMillis, (now) => {
            const current = paces.get(messageId)
            if (current !== undefined) paces.set(messageId, { ...current, nextAt: now + current.intervalMillis })
          })
        ),
        Effect.tapError((error) =>
          error.reason._tag !== "RateLimited" ? Effect.void : Effect.map(Clock.currentTimeMillis, (now) => {
            for (const [id, old] of paces) if (old.nextAt < now - paceIdleMillis) paces.delete(id)
            const intervalMillis = 2 * (paces.get(messageId)?.intervalMillis ??
              Duration.toMillis(descriptor.limits.minWriteInterval))
            const retryAfter = error.retryAfter
            paces.set(messageId, {
              intervalMillis,
              nextAt: now + (retryAfter === undefined ? intervalMillis : Duration.toMillis(retryAfter))
            })
          })
        )
      )
    })

  const call = (
    op: string,
    method: string,
    body: Readonly<Record<string, unknown>>,
    callOptions?: { readonly write?: boolean | undefined; readonly retry?: boolean | undefined }
  ) => api.call(method, body, callOptions).pipe(Effect.mapError(Errors.withOp(op)))

  const resolve = (op: string, thread: ChatThread): Effect.Effect<Address.Parts, ChatError> => {
    const parts = Address.parts(thread)
    return Option.isSome(parts) && parts.value.team === teamId
      ? Effect.succeed(parts.value)
      : fail(op, Errors.invalidRequest("invalid_thread"))
  }

  const tsOf = (op: string, write: boolean) => (answer: Json): Effect.Effect<string, ChatError> => {
    const ts = isObject(answer) ? string(answer, "ts") : undefined
    return ts === undefined ? fail(op, Errors.invalidResponse(write, "missing_ts")) : Effect.succeed(ts)
  }

  const checkSent = (op: string, sent: string, emoji: boolean): Effect.Effect<void, ChatError> => {
    if (Length.codePoints(sent) > Length.messageLength) {
      return fail(op, new TooLarge({ subject: "text", detail: "msg_too_long" }))
    }
    if (emoji && Length.blocksCost(sent) > Length.blocksLength) {
      return fail(op, new TooLarge({ subject: "text", detail: "msg_blocks_too_long" }))
    }
    return Effect.void
  }

  const messages = (answer: Json): ReadonlyArray<Json> =>
    isObject(answer) && Array.isArray(answer.messages) ? answer.messages : []

  const nextCursor = (answer: Json): Option.Option<string> => {
    const metadata = isObject(answer) ? object(answer, "response_metadata") : undefined
    const cursor = metadata === undefined ? undefined : string(metadata, "next_cursor")
    return cursor === undefined ? Option.none() : Option.some(cursor)
  }

  /** One message by ts, in or out of a thread, as Slack stores it. */
  const fetchRaw = (op: string, channel: string, ts: string): Effect.Effect<Json, ChatError> =>
    call(op, "conversations.replies", { channel, ts, latest: ts, oldest: ts, inclusive: true, limit: 2 }).pipe(
      Effect.flatMap((answer) => {
        const found = messages(answer).find((message) => isObject(message) && message.ts === ts)
        return found === undefined ? fail(op, Errors.notFound("message_not_found")) : Effect.succeed(found)
      })
    )

  const fetchMessage = Effect.fnUntraced(function*(op: string, thread: ChatThread, messageId: string) {
    const parts = yield* resolve(op, thread)
    const botUserId = yield* options.botUserId
    const raw = yield* fetchRaw(op, parts.channel, messageId)
    const message = Normalize.message(raw, { team: teamId, channel: parts.channel, botUserId })
    return message === undefined ? yield* fail(op, Errors.notFound("not_a_message")) : message
  })

  const sessionStatus = (channel: string, threadTs: string, status: SessionStatus): Effect.Effect<void> =>
    declaredAgent
      ? call("nativeStream.stop", "agents.sessions.setStatus", { channel_id: channel, thread_ts: threadTs, status }, {
        write: true,
        retry: false
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            if (hasDetail("not_authorized")(error)) declaredAgent = false
          })
        ),
        Effect.catch((error) => Effect.logDebug("agents.sessions.setStatus failed", error)),
        Effect.asVoid
      )
      : Effect.void

  // Files

  const stage = (file: File): Effect.Effect<{ readonly id: string; readonly title: string }, ChatError> =>
    Effect.gen(function*() {
      const answer = yield* call("post", "files.getUploadURLExternal", {
        filename: file.name,
        length: file.content.length
      })
      const uploadUrl = isObject(answer) ? string(answer, "upload_url") : undefined
      const fileId = isObject(answer) ? string(answer, "file_id") : undefined
      if (uploadUrl === undefined || fileId === undefined) {
        return yield* fail("post", Errors.invalidResponse(false, "missing_upload_url"))
      }
      // Staging posts nothing, so every failure here is safe to retry.
      const response = yield* options.http.execute(
        HttpClientRequest.post(uploadUrl).pipe(HttpClientRequest.bodyUint8Array(file.content, file.contentType))
      ).pipe(Effect.mapError((error) => Errors.chatError("post", Errors.transport(false, "upload_failed", error))))
      if (response.status < 200 || response.status >= 300) {
        return yield* fail("post", Errors.reasonForStatus(response.status, { write: false }))
      }
      return { id: fileId, title: file.name }
    })

  /** The ts of the message that shared a fresh upload, from `files.info`. */
  const shareTs = (answer: Json, channel: string, threadTs: string | undefined): string | undefined => {
    const file = isObject(answer) ? object(answer, "file") : undefined
    const shares = file === undefined ? undefined : object(file, "shares")
    if (shares === undefined) return undefined
    for (const visibility of ["public", "private"]) {
      const byChannel = object(shares, visibility)
      const list = byChannel === undefined ? undefined : byChannel[channel]
      if (!Array.isArray(list)) continue
      for (const share of list) {
        if (!isObject(share)) continue
        const ts = string(share, "ts")
        const shareThread = string(share, "thread_ts")
        if (
          ts !== undefined &&
          (threadTs === undefined ? shareThread === undefined || shareThread === ts : shareThread === threadTs)
        ) {
          return ts
        }
      }
    }
    return undefined
  }

  const postFiles = (
    thread: ChatThread,
    parts: Address.Parts,
    markdown: string,
    files: ReadonlyArray<File>,
    notify: Escape.Notify
  ): Effect.Effect<Posted, ChatError> =>
    Effect.gen(function*() {
      if (files.length > descriptor.limits.filesPerMessage) {
        return yield* fail("post", new TooLarge({ subject: "files", detail: "too_many_files" }))
      }
      if (files.some((file) => file.content.length > descriptor.limits.uploadBytes)) {
        return yield* fail("post", new TooLarge({ subject: "files", detail: "file_too_large" }))
      }
      // A message with files takes no `markdown_text`: its text goes as mrkdwn.
      const comment = markdown.trim() === "" ? undefined : Escape.toMrkdwn(markdown, notify)
      if (comment !== undefined) yield* checkSent("post", comment, true)
      const staged = yield* Effect.forEach(files, stage)
      yield* call("post", "files.completeUploadExternal", {
        files: staged,
        channel_id: parts.channel,
        thread_ts: parts.threadTs,
        initial_comment: comment
      }, { write: true })
      // The answer carries no message ts. Slack fills the file's shares soon after.
      for (let attempt = 0; attempt < shareAttempts; attempt++) {
        if (attempt > 0) yield* Effect.sleep(shareInterval)
        const info = yield* call("post", "files.info", { file: staged[0].id })
        const ts = shareTs(info, parts.channel, parts.threadTs)
        if (ts !== undefined) return { id: ts, thread, timestamp: Normalize.timestamp(ts) }
      }
      return yield* fail("post", new Unknown({ detail: "share_ts_unknown" }))
    })

  // History

  const page = (op: string, method: string, body: Record<string, unknown>) => (cursor: string | undefined) =>
    call(op, method, { ...body, cursor }).pipe(
      Effect.map((answer) => [messages(answer), nextCursor(answer)] as const)
    )

  const history: ChatAdapter["history"] = (thread, { direction, from }) =>
    Stream.unwrap(Effect.gen(function*() {
      const parts = yield* resolve("history", thread)
      const botUserId = yield* options.botUserId
      const context = { team: teamId, channel: parts.channel, botUserId }
      const after = (message: ChatMessage) =>
        from === undefined ||
        (direction === "forward"
          ? Address.compareTs(message.id, from) > 0
          : Address.compareTs(message.id, from) < 0)
      const normalized = (raw: Stream.Stream<Json, ChatError>) =>
        raw.pipe(
          Stream.map((message) => Normalize.message(message, context)),
          Stream.filter((message): message is ChatMessage => message !== undefined && after(message))
        )
      const reversed = (stream: Stream.Stream<ChatMessage, ChatError>) =>
        Stream.unwrap(Effect.map(Stream.runCollect(stream), (all) => Stream.fromIterable(Array.from(all).reverse())))
      if (parts.threadTs !== undefined) {
        // Oldest first, from the thread's start. Slack puts the opener on every page.
        const threadTs = parts.threadTs
        const bound = from === undefined ? {} : direction === "forward" ? { oldest: from } : { latest: from }
        const replies = page("history", "conversations.replies", {
          channel: parts.channel,
          ts: threadTs,
          limit: pageSize,
          ...bound
        })
        const stream = normalized(
          Stream.paginate(undefined as string | undefined, (cursor) =>
            Effect.map(replies(cursor), ([found, next]) =>
              [
                cursor === undefined
                  ? found
                  : found.filter((message) => !(isObject(message) && message.ts === threadTs)),
                next
              ] as const))
        )
        return direction === "forward" ? stream : reversed(stream)
      }
      // Newest first. A reply broadcast to the channel is the thread's.
      const bound = from === undefined ? {} : direction === "forward" ? { oldest: from } : { latest: from }
      const stream = normalized(
        Stream.paginate(
          undefined as string | undefined,
          page("history", "conversations.history", { channel: parts.channel, limit: pageSize, ...bound })
        )
      ).pipe(Stream.filter((message) => message.thread.id === thread.id))
      return direction === "backward" ? stream : reversed(stream)
    }))

  // Native stream

  const nativeStream: NonNullable<ChatAdapter["nativeStream"]> = {
    start: Effect.fnUntraced(function*(thread, start) {
      const op = "nativeStream.start"
      const postOptions = yield* CurrentPostOptions
      if (postOptions.nativeStream === false) {
        return yield* fail(op, new Unsupported({ capability: "nativeStream", detail: "disabled" }))
      }
      const parts = yield* resolve(op, thread)
      if (parts.threadTs === undefined || start.recipient === undefined || start.replyTo !== undefined) {
        return yield* fail(op, new Unsupported({ capability: "nativeStream" }))
      }
      const escaped = Escape.escape(start.markdown, postOptions.notify ?? {}, { flush: true })
      yield* checkSent(op, escaped.sent, true)
      const answer = yield* call(op, "chat.startStream", {
        channel: parts.channel,
        thread_ts: parts.threadTs,
        recipient_user_id: start.recipient,
        recipient_team_id: postOptions.recipientTeamId ?? parts.team,
        markdown_text: escaped.sent === "" ? undefined : escaped.sent
      }, { write: true, retry: false }).pipe(
        Effect.catchIf(
          (error) => error.reason.detail !== undefined && streamUnsupported.has(error.reason.detail),
          (error) =>
            fail(
              op,
              new Unsupported({
                capability: "nativeStream",
                ...(error.reason.detail === undefined ? {} : { detail: error.reason.detail }),
                cause: error
              })
            )
        )
      )
      const ts = yield* tsOf(op, true)(answer)
      streams.set(ts, { escape: escaped.state, text: escaped.sent, stopped: false })
      return { id: ts, thread, timestamp: Normalize.timestamp(ts) }
    }),
    append: Effect.fnUntraced(function*(thread, messageId, markdown, appendOptions) {
      const op = "nativeStream.append"
      const parts = yield* resolve(op, thread)
      const postOptions = yield* CurrentPostOptions
      const state = streams.get(messageId) ?? { escape: Escape.initialState, text: "", stopped: false }
      const escaped = Escape.escape(markdown, postOptions.notify ?? {}, {
        state: state.escape,
        flush: appendOptions?.flush === true
      })
      const held = markdown.length - escaped.consumed
      if (escaped.sent === "") return { state: "open" as const, held }
      yield* checkSent(op, state.text + escaped.sent, true)
      return yield* paced(
        messageId,
        call(op, "chat.appendStream", {
          channel: parts.channel,
          ts: messageId,
          markdown_text: escaped.sent
        }, { write: true, retry: false })
      ).pipe(
        Effect.map(() => {
          streams.set(messageId, { escape: escaped.state, text: state.text + escaped.sent, stopped: false })
          return { state: "open" as const, held }
        }),
        Effect.catchIf(
          hasDetail("message_not_in_streaming_state"),
          () => Effect.succeed({ state: "closed" as const, held: 0 })
        ),
        Effect.catchIf(hasDetail("stopped_by_user"), () =>
          Effect.sync(() => {
            streams.set(messageId, { ...state, stopped: true })
            return { state: "stopped" as const, held: 0 }
          }))
      )
    }),
    stop: Effect.fnUntraced(function*(thread, messageId, stopOptions) {
      const op = "nativeStream.stop"
      const parts = yield* resolve(op, thread)
      const postOptions = yield* CurrentPostOptions
      const state = streams.get(messageId)
      streams.delete(messageId)
      paces.delete(messageId)
      const status = stopOptions.end === "rotating" ? "processing" : postOptions.sessionStatusAtEnd
      const body = { channel: parts.channel, ts: messageId }
      const stop = status === undefined || !declaredAgent
        ? call(op, "chat.stopStream", body, { write: true, retry: false })
        : call(op, "chat.stopStream", { ...body, session_status: status }, { write: true, retry: false }).pipe(
          Effect.catchIf(hasDetail("not_authorized"), () => {
            declaredAgent = false
            return call(op, "chat.stopStream", body, { write: true, retry: false })
          })
        )
      const answer = yield* stop.pipe(
        Effect.map(Option.some),
        Effect.catchIf(hasDetail("message_not_in_streaming_state"), () => Effect.succeed(Option.none<Json>()))
      )
      const message = Option.isSome(answer) && isObject(answer.value) ? object(answer.value, "message") : undefined
      const context = message === undefined ? undefined : object(message, "ai_context")
      const result = Option.isSome(answer) && isObject(answer.value) ? answer.value.result_status : undefined
      const stopped = state?.stopped === true || result === "stopped_by_user" ||
        (context !== undefined && context.result_status === "stopped_by_user")
      if (stopped && stopOptions.end === "done" && parts.threadTs !== undefined) {
        yield* sessionStatus(parts.channel, parts.threadTs, postOptions.sessionStatusAtEnd ?? "active")
      }
      return { stopped }
    })
  }

  // Users

  const user = (id: string): Effect.Effect<SlackUser, ChatError> =>
    call("user", "users.info", { user: id }).pipe(
      Effect.flatMap((answer) => {
        const raw = isObject(answer) ? object(answer, "user") : undefined
        const userId = raw === undefined ? undefined : string(raw, "id")
        if (raw === undefined || userId === undefined) {
          return fail("user", Errors.invalidResponse(false, "missing_user"))
        }
        const userTeam = string(raw, "team_id") ?? teamId
        return Effect.succeed<SlackUser>({
          id: userId,
          teamId: userTeam,
          name: userName(raw),
          isBot: raw.is_bot === true,
          isRestricted: raw.is_restricted === true,
          isUltraRestricted: raw.is_ultra_restricted === true,
          isStranger: raw.is_stranger === true || (userTeam !== teamId && raw.enterprise_user === undefined),
          deleted: raw.deleted === true,
          raw
        })
      })
    )

  /** A `bot_message` author is a bot id, which `users.info` answers with `NotFound`. */
  const getUser: ChatAdapter["getUser"] = Effect.fnUntraced(function*(id) {
    const botUserId = yield* options.botUserId
    const found = yield* user(id).pipe(Effect.mapError(Errors.withOp("getUser")))
    return { id: found.id, name: found.name, isBot: found.isBot, isSelf: found.id === botUserId, raw: found.raw }
  })

  const adapter: ChatAdapter = {
    descriptor,
    nativeStream,
    post: Effect.fnUntraced(function*(thread, content) {
      const parts = yield* resolve("post", thread)
      if (content.replyTo !== undefined) return yield* fail("post", new Unsupported({ capability: "replyTo" }))
      const postOptions = yield* CurrentPostOptions
      const notify = postOptions.notify ?? {}
      if (content.files !== undefined && content.files.length > 0) {
        return yield* postFiles(thread, parts, content.markdown, content.files, notify)
      }
      const sent = Escape.escape(content.markdown, notify, { flush: true }).sent
      yield* checkSent("post", sent, true)
      const unfurl = postOptions.unfurl === true
      const ts = yield* call("post", "chat.postMessage", {
        channel: parts.channel,
        thread_ts: parts.threadTs,
        markdown_text: sent,
        unfurl_links: unfurl,
        unfurl_media: unfurl
      }, { write: true }).pipe(Effect.flatMap(tsOf("post", true)))
      return { id: ts, thread, timestamp: Normalize.timestamp(ts) }
    }),
    edit: Effect.fnUntraced(function*(thread, messageId, content) {
      const parts = yield* resolve("edit", thread)
      const postOptions = yield* CurrentPostOptions
      const sent = Escape.escape(content.markdown, postOptions.notify ?? {}, { flush: true }).sent
      // Slack does not apply its emoji limit to `chat.update`.
      yield* checkSent("edit", sent, false)
      yield* retrySafe(paced(
        messageId,
        call("edit", "chat.update", { channel: parts.channel, ts: messageId, markdown_text: sent }, {
          write: true,
          retry: false
        })
      ))
    }),
    delete: Effect.fnUntraced(function*(thread, messageId) {
      const parts = yield* resolve("delete", thread)
      const body = { channel: parts.channel, ts: messageId }
      yield* call("delete", "chat.delete", body, { write: true }).pipe(
        // Slack refuses to delete an open stream: stop it, then delete.
        Effect.catchIf(
          hasDetail("cant_delete_message"),
          (error) =>
            call("delete", "chat.stopStream", body, { write: true, retry: false }).pipe(
              Effect.matchEffect({
                onFailure: () => Effect.fail(error),
                onSuccess: () => {
                  streams.delete(messageId)
                  return call("delete", "chat.delete", body, { write: true })
                }
              })
            )
        )
      )
    }),
    fetchMessage: (thread, messageId) => fetchMessage("fetchMessage", thread, messageId),
    history,
    download: (thread, attachment, { maxBytes }) =>
      Stream.unwrap(Effect.gen(function*() {
        const op = "download"
        yield* resolve(op, thread)
        const tooLarge = Errors.chatError(op, new TooLarge({ subject: "files", detail: "max_bytes" }))
        if (attachment.size !== undefined && attachment.size > maxBytes) return yield* Effect.fail(tooLarge)
        const answer = yield* call(op, "files.info", { file: attachment.id })
        const file = isObject(answer) ? object(answer, "file") : undefined
        const url = file === undefined ? undefined : string(file, "url_private_download") ?? string(file, "url_private")
        if (url === undefined) return yield* fail(op, Errors.invalidResponse(false, "missing_url"))
        const response = yield* options.http.execute(
          HttpClientRequest.get(url).pipe(HttpClientRequest.bearerToken(Redacted.value(options.botToken)))
        ).pipe(Effect.mapError((error) => Errors.chatError(op, Errors.transport(false, error.reason._tag, error))))
        if (response.status < 200 || response.status >= 300) {
          return yield* fail(op, Errors.reasonForStatus(response.status, { write: false }))
        }
        let received = 0
        return response.stream.pipe(
          Stream.mapError((error) => Errors.chatError(op, Errors.transport(false, error.reason._tag, error))),
          Stream.mapEffect((chunk) => {
            received += chunk.length
            return received > maxBytes ? Effect.fail(tooLarge) : Effect.succeed(chunk)
          })
        )
      })),
    startThread: (thread, messageId) =>
      resolve("startThread", thread).pipe(
        Effect.map((parts) =>
          parts.threadTs === undefined
            ? Address.thread({ team: parts.team, channel: parts.channel, threadTs: messageId })
            : thread
        )
      ),
    getThread: Effect.fnUntraced(function*(thread) {
      const parts = yield* resolve("getThread", thread)
      const answer = yield* call("getThread", "conversations.info", { channel: parts.channel })
      const channel = isObject(answer) ? object(answer, "channel") : undefined
      if (channel === undefined) return yield* fail("getThread", Errors.invalidResponse(false, "missing_channel"))
      const direct = channel.is_im === true || channel.is_mpim === true
      const topic = object(channel, "topic")
      const topicValue = topic === undefined ? undefined : string(topic, "value")
      const name = direct ? undefined : string(channel, "name")
      const created = channel.created
      const createdAt = parts.threadTs !== undefined
        ? Normalize.timestamp(parts.threadTs)
        : typeof created === "number" && Number.isFinite(created)
        ? DateTime.makeUnsafe(created * 1000)
        : undefined
      return {
        thread,
        kind: parts.threadTs !== undefined ? "thread" : direct ? "direct" : "channel",
        ...(parts.threadTs === undefined && name !== undefined ? { name } : {}),
        ...(parts.threadTs === undefined && topicValue !== undefined ? { topic: topicValue } : {}),
        ...(parts.threadTs === undefined
          ? {}
          : { parent: Address.thread({ team: parts.team, channel: parts.channel }) }),
        ...(createdAt === undefined ? {} : { createdAt }),
        raw: channel
      } satisfies ThreadInfo
    }),
    opener: Effect.fnUntraced(function*(thread) {
      const parts = yield* resolve("opener", thread)
      if (parts.threadTs === undefined) return Option.none()
      const channelAddress = Address.thread({ team: parts.team, channel: parts.channel })
      return yield* fetchMessage("opener", channelAddress, parts.threadTs).pipe(
        Effect.map(Option.some),
        Effect.catchIf((error) => error.reason._tag === "NotFound", () => Effect.succeed(Option.none()))
      )
    }),
    getUser
  }

  return { adapter, user }
}
