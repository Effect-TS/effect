/**
 * The Discord adapter for `effect/chat`: the `Registry` layer, the
 * structural dispatch entry, the pure normaliser, a default gateway layer,
 * address helpers and the scoped post options. It runs on dfx: every REST
 * call goes through the `DiscordREST` in context.
 *
 * **Details**
 *
 * - Gateway intents: `GUILDS`, `GUILD_MESSAGES`, `GUILD_MESSAGE_REACTIONS`,
 *   `DIRECT_MESSAGES`, `DIRECT_MESSAGE_REACTIONS` and `MESSAGE_CONTENT`.
 *   They are set in the consumer's dfx config.
 * - `MESSAGE_CONTENT` is a privileged intent: switch it on for the
 *   application in Discord's developer portal. Without it, `text` is empty
 *   on every message that doesn't mention the bot, and attachments are
 *   missing.
 * - Bot permissions: View Channel, Send Messages, Send Messages in Threads,
 *   Create Public Threads, Read Message History and Attach Files.
 *
 * @stability unstable
 * @since 4.1.5
 */
import { DiscordGateway } from "dfx/DiscordGateway"
import { DiscordREST } from "dfx/DiscordREST"
import { Registry } from "effect/chat/ChatAdapter"
import type { ChatError } from "effect/chat/ChatError"
import type { ChatEvent, MessageCreated, ReactionAdded } from "effect/chat/ChatEvent"
import { ChatHandler, NotAccepted } from "effect/chat/ChatHandler"
import type { ParseMention } from "effect/chat/ChatTest"
import type { ChatThread } from "effect/chat/ChatThread"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Adapter from "./internal/adapter.ts"
import * as Errors from "./internal/errors.ts"
import * as Mentions from "./internal/mentions.ts"
import * as Normalize from "./internal/normalize.ts"
import { CurrentPostOptions } from "./internal/options.ts"

/**
 * The Discord side of the adapter, for what the core has no op for.
 *
 * **Details**
 *
 * - `botUserId` comes from `GET /users/@me`, read once. A failed read is
 *   tried again next time.
 * - `dispatch` takes one gateway dispatch, `{ t, d }`, and hands its
 *   events to the `ChatHandler` one at a time. It reads `d` with a Schema
 *   and ignores what it doesn't know, so it takes no dfx type.
 * - When a `MESSAGE_CREATE` carries no `channel_type`, `dispatch` looks
 *   the channel up, cached and with a five second timeout. A failed lookup
 *   is logged and fails with `NotAccepted`. A lookup that would fail the same
 *   way again, such as a deleted channel, is logged and the event dropped.
 * - `guild` reads the channel, cached. `None` for a direct.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class DiscordChat extends Context.Service<DiscordChat, {
  readonly botUserId: Effect.Effect<string, ChatError>
  readonly dispatch: (dispatch: {
    readonly t: string
    readonly d: unknown
  }) => Effect.Effect<void, NotAccepted, ChatHandler>
  readonly guild: (thread: ChatThread) => Effect.Effect<Option.Option<string>, ChatError>
}>()("@effect/chat-discord/DiscordChat") {}

/** The dispatches `normalize` reads. */
const handled = new Set(["MESSAGE_CREATE", "MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"])

const lookupTimeout = Duration.seconds(5)

/**
 * Registers the Discord adapter in the `Registry`.
 *
 * **Details**
 *
 * - Every REST call goes through the `DiscordREST` in context. dfx waits on
 *   its rate-limit buckets and sends again after a 429, so a rate limit
 *   shows up as a slower call. `HttpClient` is used only to download
 *   attachments from Discord's CDN, with no token.
 * - Content goes out as written: Discord reads Markdown itself. Every write
 *   sends `allowed_mentions: { parse: [] }` and the `SUPPRESS_EMBEDS`
 *   flag, on the post and on every edit, unless `withPostOptions` says
 *   otherwise. A reply does not ping its author.
 * - `post` and `edit` fail with `TooLarge` before calling Discord past
 *   2,000 code points.
 * - `replyTo` sends a message reference.
 * - Only `DEFAULT`, `REPLY`, `CHAT_INPUT_COMMAND` and
 *   `CONTEXT_MENU_COMMAND` messages are messages. A forward, a poll, a
 *   sticker or a components-only message is `DEFAULT` and comes through,
 *   often with `text: ""`. Its content stays on `raw`.
 * - A deferred command reply arrives empty. Its text comes in a later edit,
 *   which is not delivered, so only `history` and `fetchMessage` have it.
 * - A webhook message has the webhook id as its author id and `isBot`.
 *   `getUser` on that id fails `NotFound`.
 * - A mention is reported when its token is in `content` outside code and
 *   Discord says it resolved. A reply that pings its author is not a
 *   mention. Only the bot's user mention is `isSelf`: a mention of its
 *   managed role is the consumer's to recognise.
 * - The address of a thread is its channel id. `startThread` names the
 *   thread after the message's text, cut to 100 characters, and gives the
 *   existing thread when the message already has one.
 * - `history` of a thread started from a message puts the opener, from the
 *   parent channel, in place of Discord's placeholder. When the opener is
 *   deleted it starts at the first reply. A forum post's starter is in the
 *   thread itself.
 * - `getUser` with `in` gives the guild nick.
 * - There is no native streaming: streamed replies post, then edit, at
 *   least 1.5 seconds apart.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer: Layer.Layer<DiscordChat, never, DiscordREST | HttpClient.HttpClient | Registry> = Layer.effect(
  DiscordChat,
  Effect.gen(function*() {
    const rest = yield* DiscordREST
    const http = yield* HttpClient.HttpClient
    const registry = yield* Registry
    let cached: string | undefined
    const botUserId: Effect.Effect<string, ChatError> = Effect.suspend(() => {
      if (cached !== undefined) return Effect.succeed(cached)
      return rest.getMyUser().pipe(
        Effect.mapError((error) => Errors.chatError("botUserId", Errors.reasonForRestError(error, { write: false }))),
        Effect.flatMap((user) => {
          if (typeof user.id !== "string" || user.id === "") {
            return Effect.fail(Errors.chatError("botUserId", Errors.invalidResponse(false, "missing_user_id")))
          }
          cached = user.id
          return Effect.succeed(user.id)
        })
      )
    })
    const { adapter, channelType, guild } = yield* Adapter.make({ rest, http, botUserId })
    yield* registry.register(adapter)

    const refuse = (message: string, error: ChatError) =>
      Effect.andThen(Effect.logWarning(message, error), Effect.fail(new NotAccepted()))

    const dispatch = Effect.fnUntraced(function*(payload: { readonly t: string; readonly d: unknown }) {
      if (!handled.has(payload.t)) return
      const handler = yield* ChatHandler
      const self = yield* Effect.catch(botUserId, (error) => refuse("discord dispatch: bot user lookup failed", error))
      let result = Normalize.normalize(payload, { botUserId: self })
      if (result._tag === "MissingChannelType") {
        const lookup = yield* channelType(result.channelId).pipe(
          Effect.timeoutOrElse({
            duration: lookupTimeout,
            orElse: () => Effect.fail(Errors.chatError("dispatch", Errors.transport(false, "lookup_timeout")))
          }),
          Effect.map(Option.some),
          Effect.catch((error) =>
            error.retry === "denied"
              ? Effect.as(
                Effect.logWarning("discord dispatch: channel lookup denied, event dropped", error),
                Option.none()
              )
              : refuse("discord dispatch: channel lookup failed", error)
          )
        )
        if (Option.isNone(lookup)) return
        result = Normalize.normalize(payload, { botUserId: self, channelType: lookup.value })
        if (result._tag === "MissingChannelType") return
      }
      for (const event of result.events) yield* handler.handle(event)
    })

    return DiscordChat.of({ botUserId, dispatch, guild })
  })
)

/**
 * The address of a Discord channel, thread or direct: its channel id.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const thread: (channelId: string) => ChatThread = Normalize.thread

/**
 * Error for a message whose channel type is in neither the payload nor the
 * context, from `normalize`.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.5
 */
export class MissingChannelType extends Schema.TaggedError<MissingChannelType>(
  "@effect/chat-discord/DiscordChat/MissingChannelType"
)("MissingChannelType", { channelId: Schema.String }) {}

/**
 * The normaliser behind `dispatch`, without delivering.
 *
 * **Details**
 *
 * - Pure: it never looks a channel up. It reads the channel type from the
 *   payload's `channel_type`, then from `context.channelType`, Discord's
 *   numeric type, and fails with `MissingChannelType` when neither has one.
 * - Types 10, 11 and 12 are a `thread`, 1 and 3 a `direct`, and every
 *   other type a `channel`.
 * - `MESSAGE_CREATE`, `MESSAGE_REACTION_ADD` and
 *   `MESSAGE_REACTION_REMOVE` give an event. Every other dispatch, and a
 *   message type that is not a message, gives none.
 * - A custom emoji is `custom:{name}`, its id left on `raw.emoji.id`.
 * - `raw` is `d`, undecoded.
 *
 * @stability unstable
 * @category normalization
 * @since 4.1.5
 */
export const normalize = (
  dispatch: { readonly t: string; readonly d: unknown },
  context: { readonly botUserId: string; readonly channelType?: number | undefined }
): Result.Result<ReadonlyArray<ChatEvent>, MissingChannelType> => {
  const result = Normalize.normalize(dispatch, context)
  return result._tag === "Events"
    ? Result.succeed(result.events)
    : Result.fail(new MissingChannelType({ channelId: result.channelId }))
}

/**
 * The member on a message's or added reaction's `raw`: the guild, the
 * roles and the nick.
 *
 * **Details**
 *
 * Pure, with no REST call. `None` for a direct, a webhook message, or a
 * payload with no member. Discord sends no member on a removed reaction, so
 * it takes none.
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.5
 */
export const member = (event: MessageCreated | ReactionAdded): Option.Option<{
  readonly guildId: string
  readonly roles: ReadonlyArray<string>
  readonly nick?: string | undefined
}> => Normalize.memberOf(event.raw)

/**
 * The guild on an event's `raw`.
 *
 * **Details**
 *
 * Pure, with no REST call. It works for every event, webhook messages and
 * removed reactions included. `None` for a direct.
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.5
 */
export const guildId = (event: ChatEvent): Option.Option<string> => Normalize.guildIdOf(event.raw)

/**
 * For a long-running process: subscribes to dfx's gateway and feeds every
 * dispatch to `DiscordChat.dispatch`, one at a time.
 *
 * **Details**
 *
 * Intents and sharding stay in the consumer's dfx config. An event that
 * fails with `NotAccepted` is logged and dropped, since the gateway does
 * not redeliver.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layerGateway: Layer.Layer<never, never, DiscordGateway | DiscordChat | ChatHandler> = Layer.effectDiscard(
  Effect.gen(function*() {
    const gateway = yield* DiscordGateway
    const discord = yield* DiscordChat
    const handler = yield* ChatHandler
    yield* gateway.dispatch.pipe(
      Stream.runForEach((payload) => {
        const t: unknown = payload.t
        if (typeof t !== "string") return Effect.void
        return discord.dispatch({ t, d: payload.d }).pipe(
          Effect.provideService(ChatHandler, handler),
          Effect.catchCause((cause) => Effect.logWarning("discord gateway: event dropped", cause))
        )
      }),
      Effect.forkScoped
    )
  })
)

/**
 * Discord options for every write inside an effect.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export interface DiscordPostOptions {
  /**
   * Who a write may notify. Default: nobody, and a reply does not ping its
   * author. `everyone` allows `@everyone` and `@here`.
   */
  readonly notify?: {
    readonly users?: ReadonlyArray<string> | undefined
    readonly roles?: ReadonlyArray<string> | undefined
    readonly everyone?: boolean | undefined
    readonly repliedUser?: boolean | undefined
  } | undefined
  /**
   * Link embeds. Default true, which sends the `SUPPRESS_EMBEDS` flag on
   * the post and on every edit, so a link a later edit adds gets no embed
   * either. False sends no flag on a post and clears it on an edit.
   */
  readonly suppressEmbeds?: boolean | undefined
  /** For `startThread`, in minutes. Default: the channel's. */
  readonly autoArchiveDuration?: 60 | 1440 | 4320 | 10080 | undefined
}

/**
 * Scoped Discord options for every write inside `effect`. Nested calls
 * merge, the inner one winning field by field.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.5
 */
export const withPostOptions: {
  (options: DiscordPostOptions): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: DiscordPostOptions): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, options: DiscordPostOptions): Effect.Effect<A, E, R> =>
    Effect.updateService(effect, CurrentPostOptions, (current) => ({ ...current, ...options }))
)

/**
 * Reads one Discord mention token, `<@id>`, `<@!id>`, `<@&id>`,
 * `<#id>`, `@everyone` or `@here`, for `ChatTest.checkMessage`,
 * `ChatTest.checkEvent` and `ChatTest.conformance`.
 *
 * @stability unstable
 * @category testing
 * @since 4.1.5
 */
export const parseMention: ParseMention = (slice) => Option.fromUndefinedOr(Mentions.parseToken(slice))
