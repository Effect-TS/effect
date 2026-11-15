import type * as ChatEvent from "effect/chat/ChatEvent"
import type * as ChatInteraction from "effect/chat/ChatInteraction"
import type { Attachment, ChatMessage } from "effect/chat/ChatMessage"
import type { ChatThread } from "effect/chat/ChatThread"
import * as DateTime from "effect/DateTime"
import type * as Schema from "effect/Schema"
import type * as Update from "../WhatsAppUpdate.ts"
import { parseWireId } from "./actions.ts"
import * as Address from "./address.ts"
import { reasonForGraphError } from "./errors.ts"

type Json = Schema.Json
type JsonObject = { readonly [key: string]: Json }

/** What one webhook delivery holds, in order. @internal */
export type Inbound =
  | ChatEvent.MessageCreated
  | ChatEvent.ReactionAdded
  | ChatInteraction.ButtonClicked
  | ChatInteraction.SelectChanged
  | Update.WhatsAppUpdate

/** A phone number without its formatting: Meta may show `display_phone_number` with `+`, spaces or dashes. */
const digits = (phone: string) => phone.replace(/\D/g, "")

const isObject = (u: unknown): u is JsonObject => typeof u === "object" && u !== null && !Array.isArray(u)

const string = (object: JsonObject | undefined, key: string): string | undefined => {
  const value = object?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const object = (object: JsonObject | undefined, key: string): JsonObject | undefined => {
  const value = object?.[key]
  return isObject(value) ? value : undefined
}

const array = (value: Json | undefined): ReadonlyArray<Json> => Array.isArray(value) ? value : []

const timestamp = (value: string | undefined) => {
  const seconds = Number(value)
  return value !== undefined && Number.isFinite(seconds) ? DateTime.makeUnsafe(seconds * 1000) : undefined
}

const media = ["image", "video", "audio", "document", "sticker"] as const

/** Whether a message is from a group, which the adapter does not support yet. @internal */
export const isGroupMessage = (message: Json): boolean =>
  isObject(message) && (message.group_id !== undefined || string(object(message, "context"), "group_id") !== undefined)

/** The messages of a delivery that are from groups. @internal */
export const groupMessages = (envelope: unknown): number => {
  let count = 0
  if (!isObject(envelope)) return count
  for (const entry of array(envelope.entry)) {
    for (const change of array(isObject(entry) ? entry.changes : undefined)) {
      const value = isObject(change) ? object(change, "value") : undefined
      for (const message of array(value?.messages)) if (isGroupMessage(message)) count++
      for (const status of array(value?.statuses)) if (isObject(status) && status.recipient_type === "group") count++
    }
  }
  return count
}

const fromMessage = (
  value: JsonObject,
  metadata: JsonObject,
  phoneNumberId: string,
  message: Json
): ReadonlyArray<Inbound> => {
  if (!isObject(message) || isGroupMessage(message)) return []
  const id = string(message, "id")
  const contacts = array(value.contacts).filter(isObject)
  const from = string(message, "from")
  const fromUserId = string(message, "from_user_id")
  const contact =
    contacts.find((contact) =>
      (fromUserId !== undefined && contact.user_id === fromUserId) || (from !== undefined && contact.wa_id === from)
    ) ?? contacts[0]
  const user = fromUserId ?? string(contact, "user_id") ?? from
  if (id === undefined || user === undefined || !Address.isUser(user)) return []
  const thread = Address.thread({ phoneNumberId, kind: "user", id: user })
  const raw: Json = { metadata, contacts: contact === undefined ? [] : [contact], messages: [message] }
  const at = timestamp(string(message, "timestamp"))
  const type = string(message, "type")
  switch (type) {
    case "system": {
      const system = object(message, "system")
      const change = string(system, "type")
      if (change !== "user_changed_number" && change !== "user_changed_user_id") return []
      const next = string(system, "user_id") ?? string(system, "wa_id")
      if (next === undefined || !Address.isUser(next)) return []
      const userId = string(system, "user_id")
      const previousUserId = string(system, "previous_user_id")
      const phone = string(system, "wa_id")
      return [{
        _tag: "UserIdChanged",
        thread: Address.thread({ phoneNumberId, kind: "user", id: next }),
        id,
        change,
        ...(userId === undefined ? {} : { userId }),
        ...(previousUserId === undefined ? {} : { previousUserId }),
        ...(phone === undefined ? {} : { phone }),
        ...(from === undefined ? {} : { previousPhone: from }),
        ...(at === undefined ? {} : { timestamp: at }),
        raw
      }]
    }
    case "reaction": {
      const reaction = object(message, "reaction")
      const emoji = string(reaction, "emoji")
      const messageId = string(reaction, "message_id")
      // An empty emoji is a removed reaction, which is dropped.
      if (emoji === undefined || messageId === undefined) return []
      return [{
        _tag: "ReactionAdded",
        thread,
        messageId,
        userId: user,
        emoji,
        ...(at === undefined ? {} : { timestamp: at }),
        raw
      }]
    }
    case "interactive": {
      const interactive = object(message, "interactive")
      const reply = object(interactive, "button_reply") ?? object(interactive, "list_reply")
      const wire = string(reply, "id")
      const parsed = wire === undefined ? undefined : parseWireId(wire)
      const messageId = string(object(message, "context"), "id")
      if (parsed === undefined || messageId === undefined) return []
      const origin = { thread, messageId, userId: user, raw }
      return parsed.kind === "select"
        ? [{ _tag: "SelectChanged", id: parsed.id, value: parsed.value, ...origin }]
        : [{
          _tag: "ButtonClicked",
          id: parsed.id,
          ...(parsed.value === undefined ? {} : { value: parsed.value }),
          ...origin
        }]
    }
    case "unsupported":
    case "request_welcome":
      return []
  }
  const attachments: Array<Attachment> = []
  let text = string(object(message, "text"), "body") ?? string(object(message, "button"), "text") ?? ""
  for (const kind of media) {
    const item = object(message, kind)
    const mediaId = string(item, "id")
    if (mediaId === undefined) continue
    const name = string(item, "filename")
    const contentType = string(item, "mime_type")
    attachments.push({
      id: mediaId,
      ...(name === undefined ? {} : { name }),
      ...(contentType === undefined ? {} : { contentType })
    })
    text = string(item, "caption") ?? text
  }
  const context = object(message, "context")
  const replyId = string(context, "id")
  const quoted = string(context, "from")
  const name = string(object(contact, "profile"), "name")
  const chatMessage: ChatMessage = {
    id,
    thread,
    author: { id: user, ...(name === undefined ? {} : { name }), isBot: false, isSelf: false },
    text,
    mentions: [],
    ...(replyId === undefined ? {} : {
      replyTo: {
        messageId: replyId,
        ...(quoted === undefined
          ? {}
          : { isSelf: digits(quoted) === digits(string(metadata, "display_phone_number") ?? "") })
      }
    }),
    attachments,
    timestamp: at ?? DateTime.makeUnsafe(0),
    raw: message
  }
  return [{ _tag: "MessageCreated", thread, kind: "direct", message: chatMessage, raw }]
}

const statuses = new Set(["sent", "delivered", "read", "failed"])

const fromStatus = (metadata: JsonObject, phoneNumberId: string, status: Json): ReadonlyArray<Inbound> => {
  if (!isObject(status) || status.recipient_type === "group") return []
  const messageId = string(status, "id")
  const value = string(status, "status")
  const phone = string(status, "recipient_id")
  const userId = string(status, "recipient_user_id")
  const user = userId ?? phone
  if (messageId === undefined || value === undefined || !statuses.has(value) || user === undefined) return []
  if (!Address.isUser(user)) return []
  const thread: ChatThread = Address.thread({ phoneNumberId, kind: "user", id: user })
  const raw: Json = { metadata, statuses: [status] }
  const at = timestamp(string(status, "timestamp"))
  const error = array(status.errors).find(isObject)
  const code = error?.code
  const out: Array<Inbound> = [{
    _tag: "Status",
    thread,
    messageId,
    status: value as Update.Status["status"],
    ...(at === undefined ? {} : { timestamp: at }),
    ...(value === "failed" && typeof code === "number"
      ? { reason: reasonForGraphError({ code }, { write: false, cause: error }) }
      : {}),
    ...(phone === undefined ? {} : { phone }),
    ...(userId === undefined ? {} : { userId }),
    raw
  }]
  if (value !== "failed" && phone !== undefined && userId !== undefined) {
    out.push({ _tag: "Alias", thread, phone, userId, messageId, status: value as Update.Alias["status"], raw })
  }
  return out
}

/** @internal */
export const normalize = (envelope: unknown, context: { readonly phoneNumberId: string }): ReadonlyArray<Inbound> => {
  const out: Array<Inbound> = []
  if (!isObject(envelope) || envelope.object !== "whatsapp_business_account") return out
  for (const entry of array(envelope.entry)) {
    for (const change of array(isObject(entry) ? entry.changes : undefined)) {
      if (!isObject(change) || change.field !== "messages") continue
      const value = object(change, "value")
      const metadata = object(value, "metadata")
      if (
        value === undefined || metadata === undefined || string(metadata, "phone_number_id") !== context.phoneNumberId
      ) {
        continue
      }
      for (const message of array(value.messages)) {
        out.push(...fromMessage(value, metadata, context.phoneNumberId, message))
      }
      for (const status of array(value.statuses)) out.push(...fromStatus(metadata, context.phoneNumberId, status))
    }
  }
  return out
}
