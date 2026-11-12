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
 *   disabled button.
 *
 * @stability unstable
 * @since 4.1.5
 */
import { Registry } from "effect/chat/ChatAdapter"
import type { ChatError } from "effect/chat/ChatError"
import type { ChatEvent } from "effect/chat/ChatEvent"
import { ChatHandler } from "effect/chat/ChatHandler"
import type { ParseMention } from "effect/chat/ChatTest"
import type { ChatThread } from "effect/chat/ChatThread"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
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
 * - Content goes out as `markdown_text`. A `<` outside inline and fenced
 *   code is sent as `&lt;`, so no mention token notifies unless
 *   `withPostOptions({ notify })` allows it.
 * - `post` fails with `TooLarge` before calling Slack when the text as sent
 *   passes 12,000 code points, or 13,200 with every emoji counted as its
 *   shortcode. `edit` applies only the first limit, as Slack does.
 * - A post with files uploads them and shares them as one message. Its text
 *   goes as Slack mrkdwn, since such a message takes no `markdown_text`.
 * - `replyTo` is not supported.
 * - A message from another app or an incoming webhook (`bot_message`) has
 *   the `bot_id` as its author id. `getUser` on that id fails `NotFound`.
 * - A thread root whose subtype is not a message, such as an agent-view
 *   chat's `assistant_app_thread` root, is treated as deleted: `opener`
 *   gives `None` and history starts at the first reply.
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
        botUserId
      })
      yield* registry.register(adapter)
      return SlackChat.of({ teamId: options.teamId, botUserId, user })
    })
  ).pipe(Layer.provideMerge(WebApi.layer({ botToken: options.botToken })))

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
 * - Answers 503, so Slack retries, when the handler fails `NotAccepted` or
 *   runs past `deadline` (2.5 seconds by default), and 413 past
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
 *   and from `text` outside code otherwise.
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
 * A Slack emoji name, with or without colons and with skin tone suffixes, as
 * Unicode. `None` for a name the table doesn't know, such as a custom emoji.
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
