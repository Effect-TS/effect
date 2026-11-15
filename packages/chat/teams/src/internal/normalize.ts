import type * as ChatEvent from "effect/chat/ChatEvent"
import type * as ChatMessage from "effect/chat/ChatMessage"
import type * as ChatThread from "effect/chat/ChatThread"
import * as DateTime from "effect/DateTime"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import * as Address from "./address.ts"
import * as Download from "./download.ts"

type JsonObject = { readonly [key: string]: Schema.Json }

/** @internal */
export const isObject = (u: unknown): u is JsonObject => typeof u === "object" && u !== null && !Array.isArray(u)

/** @internal */
export const string = (object: JsonObject | undefined, key: string): string | undefined => {
  const value = object?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

/** @internal */
export const object = (object: JsonObject | undefined, key: string): JsonObject | undefined => {
  const value = object?.[key]
  return isObject(value) ? value : undefined
}

/** @internal */
export interface Context {
  readonly appId: string
  readonly connectorHosts: ReadonlySet<string>
  readonly fileHostSuffixes: ReadonlyArray<string>
}

/** The bot's own Connector id. @internal */
export const botId = (appId: string): string => `28:${appId}`

/**
 * The public id of a user: the Entra object id for a person, the Connector
 * id (`29:…`, `28:…`) for a bot or anyone without one.
 *
 * @internal
 */
export const userId = (account: JsonObject): string | undefined =>
  string(account, "aadObjectId") ?? string(account, "id")

/**
 * Whether the activity was sent to the bot alone, as a targeted message.
 * Read from `recipient.isTargeted`.
 *
 * @internal
 */
export const isTargeted = (activity: JsonObject): boolean => object(activity, "recipient")?.isTargeted === true

/**
 * Where an activity's message lives, and what kind of address it is. A
 * channel post's conversation names the post itself as its reply chain
 * root: such a post is addressed to the channel, and is the opener of the
 * thread under it.
 *
 * @internal
 */
export const threadOf = (
  activity: JsonObject
): { readonly thread: ChatThread.ChatThread; readonly kind: ChatEvent.ThreadKind } | undefined => {
  const conversationId = string(object(activity, "conversation"), "id")
  if (conversationId === undefined || conversationId.length > Address.maxIdLength) return undefined
  const parts = Address.parts(Address.thread(conversationId))
  if (Option.isNone(parts)) return undefined
  const id = string(activity, "id")
  if (parts.value.root !== undefined && parts.value.root === id) {
    return { thread: Address.thread(parts.value.base), kind: "channel" }
  }
  const conversationType = string(object(activity, "conversation"), "conversationType")
  return {
    thread: Address.thread(conversationId),
    kind: parts.value.root !== undefined ? "thread" : conversationType === "personal" ? "direct" : "channel"
  }
}

const timestamp = (activity: JsonObject): DateTime.Utc | undefined => {
  const value = string(activity, "timestamp")
  if (value === undefined) return undefined
  return Option.getOrUndefined(DateTime.make(value).pipe(Option.map(DateTime.toUtc)))
}

const mentionKind = (mentioned: JsonObject, conversationId: string): ChatMessage.Mention["kind"] => {
  if (string(mentioned, "type") === "tag") return "role"
  const id = string(mentioned, "id") ?? ""
  if (id === Address.baseConversation(conversationId) || id.startsWith("19:")) return "channel"
  return "user"
}

/**
 * The mention entities, in order, located in `text` by their `<at>` text.
 * An entity whose text is not found is left out.
 */
const mentions = (activity: JsonObject, text: string, self: string): Array<ChatMessage.Mention> => {
  const entities = activity.entities
  if (!Array.isArray(entities)) return []
  const conversationId = string(object(activity, "conversation"), "id") ?? ""
  const out: Array<ChatMessage.Mention> = []
  let from = 0
  for (const entity of entities) {
    if (!isObject(entity) || entity.type !== "mention") continue
    const mentioned = object(entity, "mentioned")
    const token = string(entity, "text")
    const id = mentioned === undefined ? undefined : userId(mentioned)
    if (mentioned === undefined || token === undefined || id === undefined) continue
    const start = text.indexOf(token, from)
    if (start === -1) continue
    from = start + token.length
    out.push({
      kind: mentionKind(mentioned, conversationId),
      id,
      start,
      end: start + token.length,
      isSelf: string(mentioned, "id") === self
    })
  }
  return out
}

const attachments = (activity: JsonObject, context: Context): Array<ChatMessage.Attachment> => {
  const list = activity.attachments
  const serviceUrl = string(activity, "serviceUrl")
  if (!Array.isArray(list) || serviceUrl === undefined) return []
  const conversationType = string(object(activity, "conversation"), "conversationType")
  const out: Array<ChatMessage.Attachment> = []
  for (const attachment of list) {
    if (isObject(attachment) && attachment.contentType === "text/html") continue
    const classified = Download.classify(attachment, {
      serviceUrl,
      ...(conversationType === undefined ? {} : { conversationType }),
      connectorHosts: context.connectorHosts,
      fileHostSuffixes: context.fileHostSuffixes
    })
    if (classified !== undefined) out.push(classified)
  }
  return out
}

/**
 * A `message` activity as a `ChatMessage`.
 *
 * - `text` is Teams' `text` as delivered, with `<at>…</at>` for each
 *   mention, which is where `mentions` point.
 * - The author id follows `userId`. `raw` keeps the Connector id.
 *
 * @internal
 */
export const message = (activity: JsonObject, context: Context): ChatMessage.ChatMessage | undefined => {
  const id = string(activity, "id")
  const from = object(activity, "from")
  const author = from === undefined ? undefined : userId(from)
  const at = threadOf(activity)
  const time = timestamp(activity)
  if (id === undefined || from === undefined || author === undefined || at === undefined || time === undefined) {
    return undefined
  }
  const self = botId(context.appId)
  const connectorId = string(from, "id") ?? ""
  const text = typeof activity.text === "string" ? activity.text : ""
  const name = string(from, "name")
  return {
    id,
    thread: at.thread,
    author: {
      id: author,
      ...(name === undefined ? {} : { name }),
      isBot: connectorId.startsWith("28:"),
      isSelf: connectorId === self
    },
    text,
    mentions: mentions(activity, text, self),
    attachments: attachments(activity, context),
    timestamp: time,
    raw: activity
  }
}

const reactionEmoji: Readonly<Record<string, string>> = {
  like: "\u{1F44D}",
  heart: "\u2764\uFE0F",
  laugh: "\u{1F606}",
  surprised: "\u{1F62E}",
  sad: "\u{1F622}",
  angry: "\u{1F621}"
}

/**
 * A Teams reaction type as an emoji: the six documented types as Unicode,
 * any other as `custom:{type}`.
 *
 * @internal
 */
export const emoji = (type: string): string => reactionEmoji[type] ?? `custom:${type}`

const reactions = (activity: JsonObject): Array<ChatEvent.ChatEvent> => {
  const messageId = string(activity, "replyToId")
  const from = object(activity, "from")
  const user = from === undefined ? undefined : userId(from)
  const at = threadOf(activity)
  if (messageId === undefined || user === undefined || at === undefined) return []
  const time = timestamp(activity)
  const out: Array<ChatEvent.ChatEvent> = []
  for (const [key, tag] of [["reactionsAdded", "ReactionAdded"], ["reactionsRemoved", "ReactionRemoved"]] as const) {
    const list = activity[key]
    if (!Array.isArray(list)) continue
    for (const reaction of list) {
      const type = isObject(reaction) ? string(reaction, "type") : undefined
      if (type === undefined) continue
      out.push({
        _tag: tag,
        thread: at.thread,
        messageId,
        userId: user,
        emoji: emoji(type),
        ...(time === undefined ? {} : { timestamp: time }),
        raw: activity
      })
    }
  }
  return out
}

/**
 * A verified, untargeted activity as zero or more events. A `message`
 * carrying a card submit (`value`) is an interaction, not a message, and
 * gives none here.
 *
 * @internal
 */
export const normalize = (activity: unknown, context: Context): ReadonlyArray<ChatEvent.ChatEvent> => {
  if (!isObject(activity) || isTargeted(activity)) return []
  switch (activity.type) {
    case "message": {
      if (activity.value !== undefined) return []
      const at = threadOf(activity)
      const created = message(activity, context)
      if (at === undefined || created === undefined) return []
      return [{ _tag: "MessageCreated", thread: at.thread, kind: at.kind, message: created, raw: activity }]
    }
    case "messageReaction":
      return reactions(activity)
    default:
      return []
  }
}
