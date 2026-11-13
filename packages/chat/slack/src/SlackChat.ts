/**
 * The Slack adapter for `effect/chat`: the `Registry` layer, the Events API
 * webhook, the pure normaliser, address helpers and the scoped post options.
 *
 * **Details**
 *
 * - Bot token scopes: `chat:write`, `channels:history`, `groups:history`,
 *   `im:history`, `mpim:history`, `channels:read`, `groups:read`,
 *   `im:read`, `mpim:read`, `users:read`, `reactions:read`, `files:read`
 *   and `files:write`.
 * - Event subscriptions, sent to `layerWebhook`'s path: `message.channels`,
 *   `message.groups`, `message.im`, `message.mpim`, `app_mention`,
 *   `reaction_added`, `reaction_removed` and `agent_session_stopped`.
 * - Slack's stop button also needs the app declared as an agent with
 *   `features.agent_view` in the manifest. Slack documents that declaration
 *   as irreversible. Without it the adapter's session status calls answer
 *   `not_authorized`; it then stops making them, and replies still work.
 * - A click on the stop button stops nothing by itself: the consumer gets a
 *   `StopRequested` and ends the reply. Until it does, the user sees a
 *   disabled button. Every click is a separate `StopRequested`, and only
 *   the first in a thread lists the open stream in `messageIds`.
 *
 * @stability unstable
 * @since 4.1.5
 */
import { Registry } from "effect/chat/ChatAdapter"
import { type ChatError, ChatErrorReason } from "effect/chat/ChatError"
import type { ChatEvent } from "effect/chat/ChatEvent"
import { ChatHandler } from "effect/chat/ChatHandler"
import type { ParseMention } from "effect/chat/ChatTest"
import { ChatThread } from "effect/chat/ChatThread"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Adapter from "./internal/adapter.ts"
import * as Address from "./internal/address.ts"
import * as Emoji from "./internal/emoji.ts"
import * as Errors from "./internal/errors.ts"
import * as Mentions from "./internal/mentions.ts"
import * as Normalize from "./internal/normalize.ts"
import { CurrentPostOptions } from "./internal/options.ts"
import * as Webhook from "./internal/webhook.ts"
import { SlackWebApi } from "./SlackWebApi.ts"
import * as WebApi from "./SlackWebApi.ts"

const isRecord = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

/**
 * A Slack user from `users.info`, with guest and Slack Connect status.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface SlackUser {
  readonly id: string
  readonly teamId: string
  readonly name: string
  readonly isBot: boolean
  readonly isRestricted: boolean
  readonly isUltraRestricted: boolean
  /** A Slack Connect user from another organisation. */
  readonly isStranger: boolean
  readonly deleted: boolean
  readonly raw: Schema.Json
}

/**
 * The Slack side of the adapter, for what the core has no op for.
 *
 * **Details**
 *
 * - `botUserId` comes from `auth.test`, read once. A failed read is tried
 *   again next time.
 * - `user` calls `users.info` each time. Nothing is cached.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class SlackChat extends Context.Service<SlackChat, {
  readonly teamId: string
  readonly botUserId: Effect.Effect<string, ChatError>
  readonly user: (id: string) => Effect.Effect<SlackUser, ChatError>
}>()("@effect/chat-slack/SlackChat") {}

/**
 * Registers the Slack adapter in the `Registry`, for one workspace.
 *
 * **Details**
 *
 * - `post` and `edit` send the Markdown as one `markdown` block, in which
 *   a `<` outside inline and fenced code goes as `&lt;`, plus a `text` the
 *   adapter builds, in which every `<`, `>` and `&` goes as an entity.
 *   Slack decides who a message mentions from `text`, so no token notifies
 *   unless `withPostOptions({ notify })` allows it. Allowed tokens stay
 *   intact in both.
 * - That `text` is cut to 16,000 code points on a post and 3,800 UTF-8
 *   bytes on an edit, on a grapheme cluster boundary, ending in `…` with
 *   the allowed tokens the cut left out appended. The cut never fails.
 *   Stream appends still go as `markdown_text`.
 * - `post`, `edit` and stream writes fail with `TooLarge` before calling
 *   Slack when the text as sent passes 12,000 code points. Slack's second
 *   limit, 13,200 with every emoji counted as its shortcode, is left to
 *   Slack, whose refusal is also `TooLarge` and posts nothing.
 *   `descriptor.measure` keeps a part under both.
 * - A post with files uploads them with no channel, posts the message, then
 *   attaches them with `chat.update` and `file_ids`. Both calls send the
 *   same blocks and `text`, so the `text` of a post with files is cut to the
 *   update budget of 3,800 bytes. A post with files and no Markdown carries
 *   the file names, joined by ", ", as its text, and keeps them.
 * - A post with files is all-or-nothing. A file Slack refuses at upload,
 *   one past `limits`, or an attach Slack refuses fails the post `denied`
 *   with detail `file_refused`: a refused attach first deletes the message
 *   and then the files, best effort. A timed out attach is retried, for up
 *   to a minute in all, waits after a 429 included; past that it is rolled
 *   back the same way. When the message can't be deleted, the post fails
 *   `Unknown` with detail `attach_failed_message_left` and a
 *   `SlackAttachFailed` as its cause. From the post on, the route can't be
 *   interrupted, and each call has a timeout.
 * - `edit` keeps a message's files, and `delete` removes the message and
 *   not its files: a user may have shared them on. Read the file ids with
 *   `fetchMessage` before deleting to remove them too.
 * - A mention in a post with files can notify for a message that a refused
 *   attach then deletes.
 * - A post with files in a Slack Connect channel is untested.
 * - `replyTo` is not supported.
 * - A message from another app or an incoming webhook (`bot_message`) has
 *   the `bot_id` as its author id. `getUser` on that id fails `NotFound`.
 * - A thread root whose subtype is not a message, such as an agent-view
 *   chat's `assistant_app_thread` root, is treated as deleted: `opener`
 *   gives `None` and history starts at the first reply.
 * - Edits to one message are at least 3 seconds apart.
 * - After a 429 on a stream append or an edit, the next write to that
 *   message waits for the retry-after, and later writes to it wait twice
 *   the interval, for the rest of the reply. A stream started with
 *   `continues` keeps the pace of the part it continues.
 * - The native stream needs a thread and a recipient, and rotates before
 *   Slack's ten minute cap. A reply that ends after a click on the stop
 *   button moves the agent session off `processing`.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (options: {
  readonly botToken: Redacted.Redacted
  readonly teamId: string
}): Layer.Layer<SlackChat | SlackWebApi, never, HttpClient.HttpClient | Registry> =>
  Layer.effect(
    SlackChat,
    Effect.gen(function*() {
      const api = yield* SlackWebApi
      const http = yield* HttpClient.HttpClient
      const registry = yield* Registry
      let cached: string | undefined
      const botUserId: Effect.Effect<string, ChatError> = Effect.suspend(() => {
        if (cached !== undefined) return Effect.succeed(cached)
        return api.call("auth.test", {}).pipe(
          Effect.mapError(Errors.withOp("botUserId")),
          Effect.flatMap((answer) => {
            const id = isRecord(answer) ? answer.user_id : undefined
            if (typeof id !== "string" || id === "") {
              return Effect.fail(Errors.chatError("botUserId", Errors.invalidResponse(false, "missing_user_id")))
            }
            cached = id
            return Effect.succeed(id)
          })
        )
      })
      const { adapter, user } = Adapter.make({
        api,
        http,
        botToken: options.botToken,
        teamId: options.teamId,
        botUserId,
        attachFailed: (fields) => new SlackAttachFailed(fields)
      })
      yield* registry.register(adapter)
      return SlackChat.of({ teamId: options.teamId, botUserId, user })
    })
  ).pipe(Layer.provideMerge(WebApi.layer({ botToken: options.botToken })))

/**
 * The `cause` of a `post` with files that failed `uncertain` with detail
 * `attach_failed_message_left`.
 *
 * **Details**
 *
 * - The attach failed and the message could not be deleted. The message may
 *   still exist, with or without its files: an attach that timed out may
 *   have landed, and a delete that timed out may have too. `messageId` is
 *   that message and `fileIds` are its files, which are kept. `reason` is
 *   the attach's own.
 * - Its `message` leaves the ids out.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.5
 */
export class SlackAttachFailed
  extends Schema.TaggedError<SlackAttachFailed>("@effect/chat-slack/SlackChat/SlackAttachFailed")(
    "SlackAttachFailed",
    {
      thread: ChatThread,
      messageId: Schema.String,
      fileIds: Schema.Array(Schema.String),
      reason: ChatErrorReason
    }
  )
{
  override get message(): string {
    return `Slack did not attach the files and the message may be left: ${this.reason.message}`
  }
}

/**
 * The address of a Slack channel, direct conversation or thread:
 * `{team}/{channel}`, or `{team}/{channel}/{threadTs}` for a thread.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const thread: (parts: {
  readonly team: string
  readonly channel: string
  readonly threadTs?: string | undefined
}) => ChatThread = Address.thread

/**
 * The parts of a Slack address, or `None` for another platform's or a
 * malformed one.
 *
 * @stability unstable
 * @category destructors
 * @since 4.1.5
 */
export const parts: (thread: ChatThread) => Option.Option<{
  readonly team: string
  readonly channel: string
  readonly threadTs?: string | undefined
}> = Address.parts

/**
 * `POST {path}`: the Events API webhook.
 *
 * **Details**
 *
 * - Checks the `v0` signature with the signing secret and a five minute
 *   window, then answers `url_verification`.
 * - An envelope for another app, another workspace or of another type is
 *   answered 200 and dropped.
 * - The events go through `normalize` to the `ChatHandler`, one at a time.
 * - Answers 503, so Slack retries, when the handler fails `NotAccepted`, or
 *   when reading the bot user and running the handler take longer than
 *   `deadline` (2.5 seconds by default). Answers 413 past
 *   `maxBodyBytes` (1 MiB by default).
 * - Slack redelivers on a timeout or an error, so an event can arrive twice.
 *   `ChatEvent.dedupeKey` gives the two deliveries equal keys.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layerWebhook = (options: {
  readonly path: `/${string}`
  readonly signingSecret: Redacted.Redacted
  readonly appId: string
  readonly deadline?: Duration.Duration | undefined
  readonly maxBodyBytes?: number | undefined
}): Layer.Layer<never, never, HttpRouter.HttpRouter | SlackChat | ChatHandler> =>
  HttpRouter.use(Effect.fnUntraced(function*(router) {
    const slack = yield* SlackChat
    const handler = yield* ChatHandler
    const verify = yield* Webhook.makeVerifier(options.signingSecret)
    const webhookOptions: Webhook.Options = {
      verify,
      appId: options.appId,
      teamId: slack.teamId,
      botUserId: slack.botUserId,
      handle: handler.handle,
      deadline: options.deadline ?? Duration.millis(2500),
      maxBodyBytes: options.maxBodyBytes ?? 1024 * 1024
    }
    yield* router.add("POST", options.path, (request) => Webhook.handleRequest(request, webhookOptions))
  }))

/**
 * The normaliser, for Socket Mode or a consumer's own transport.
 *
 * **Details**
 *
 * - Pure: takes an `event_callback` envelope, gives zero or more events.
 * - An envelope for another workspace gives none. The team in an address is
 *   the workspace, from the envelope's `team_id` or `authorizations`.
 * - `message` and `app_mention` for one message give equal events. An
 *   `app_mention` that carries `edited` gives none.
 * - A message subtype other than `file_share`, `thread_broadcast`,
 *   `bot_message` and `me_message` gives none.
 * - Mentions come from the message's `rich_text` block when it has one,
 *   and only for elements whose token is in `text`, since Slack decides a
 *   mention from `text`. Without a `rich_text` block they come from `text`
 *   outside code.
 * - The bot's own messages with a `rich_text` block read back with `text`
 *   rendered from the blocks as Markdown, whole and with its newlines, as
 *   the stored `text` the adapter sent may be cut. Everyone else's `text`
 *   is Slack's field as stored.
 * - `agent_session_stopped` gives a `StopRequested`.
 * - `raw` is the envelope without its verification `token`.
 *
 * @stability unstable
 * @category normalization
 * @since 4.1.5
 */
export const normalize: (
  envelope: unknown,
  context: { readonly teamId: string; readonly botUserId: string }
) => ReadonlyArray<ChatEvent> = Normalize.normalize

/**
 * Slack options for every write inside an effect.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface SlackPostOptions {
  /** Which mention tokens may notify. Default: none. */
  readonly notify?: {
    readonly users?: ReadonlyArray<string> | undefined
    readonly groups?: ReadonlyArray<string> | undefined
    readonly broadcast?: boolean | undefined
  } | undefined
  /**
   * Link and media previews. Default false, which sends `unfurl_links` and
   * `unfurl_media` both false; true sends both true.
   *
   * **Details**
   *
   * - It applies to `post` only: `chat.update` has no unfurl parameter.
   *   An edit that adds a link gets no preview either way, which a live
   *   check confirmed, so a post-then-edit stream never unfurls.
   * - Slack disables unfurling in streaming messages, so it does nothing on
   *   a native stream.
   */
  readonly unfurl?: boolean | undefined
  /** Default true where the workspace supports it. */
  readonly nativeStream?: boolean | undefined
  /** For a Connect channel, where the recipient is on another team. */
  readonly recipientTeamId?: string | undefined
  /** The agent session status at a normal end of a native stream. Default `active`. */
  readonly sessionStatusAtEnd?: "active" | "processing" | "suspended" | "closed" | undefined
}

/**
 * Scoped Slack options for every write inside `effect`. Nested calls merge,
 * the inner one winning field by field.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.5
 */
export const withPostOptions: {
  (options: SlackPostOptions): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: SlackPostOptions): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: SlackPostOptions): Effect.Effect<A, E, R> =>
    Effect.updateService(effect, CurrentPostOptions, (current) => ({ ...current, ...options }))
)

/**
 * A Slack emoji name, with or without colons and with at most one skin tone
 * suffix (`+1::skin-tone-4`), as Unicode. `None` for a name the table
 * doesn't know, such as a custom emoji, and for a name with two tones.
 *
 * @stability unstable
 * @category emoji
 * @since 4.1.5
 */
export const emojiFromName = (name: string): Option.Option<string> => Option.fromUndefinedOr(Emoji.fromName(name))

/**
 * An emoji as its Slack name, without colons.
 *
 * @stability unstable
 * @category emoji
 * @since 4.1.5
 */
export const emojiToName = (emoji: string): Option.Option<string> => Option.fromUndefinedOr(Emoji.toName(emoji))

/**
 * Reads one Slack mention token, such as `<@U123>`, `<!subteam^S123|@team>`,
 * `<#C123|name>` or `<!here>`, for `ChatTest.checkMessage`,
 * `ChatTest.checkEvent` and `ChatTest.conformance`.
 *
 * @stability unstable
 * @category testing
 * @since 4.1.5
 */
export const parseMention: ParseMention = (slice) => Option.fromUndefinedOr(Mentions.parseToken(slice))
