import type { Capability, ChatError } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import type { ChatThread } from "effect/chat/ChatThread"
import type * as ChatUi from "effect/chat/ChatUi"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { Made } from "./adapter.ts"
import { modalFields, modalMetadataLength } from "./adapter.ts"
import * as Address from "./address.ts"
import * as Envelope from "./envelope.ts"
import * as Errors from "./errors.ts"
import { isObject, object, string, threadOf, userId } from "./normalize.ts"
import * as Render from "./render.ts"

type JsonObject = { readonly [key: string]: Schema.Json }

/** The default share of Teams' invoke timeout the handler gets. @internal */
export const defaultDeadline = Duration.seconds(4)

/** An answer to an invoke: the HTTP status and the JSON body, if any. @internal */
export interface InvokeResponse {
  readonly status: number
  readonly body?: Schema.Json | undefined
}

const isLate = Schema.is(ChatInteraction.Late)

const ok: InvokeResponse = { status: 200 }

/** What an invoke that fails a check gets. It names no reason. */
const safeFailure = (name: string): InvokeResponse =>
  name === "adaptiveCard/action"
    ? {
      status: 200,
      body: {
        statusCode: 400,
        type: "application/vnd.microsoft.error",
        value: { code: "BadRequest", message: "This action could not be completed." }
      }
    }
    : { status: 200, body: { task: { type: "message", value: "This action could not be completed." } } }

const executeAck: InvokeResponse = {
  status: 200,
  body: { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: "" }
}

/** @internal */
export interface Options {
  readonly capabilities: ReadonlySet<Capability>
  readonly envelope: Envelope.Envelope | undefined
  /** The ids of the buttons that open a dialog. */
  readonly modalButtons: ReadonlySet<string>
  readonly answer: Made["answer"]
  readonly deadline: Duration.Duration
}

const refused = (event: ChatInteraction.ButtonClicked | ChatInteraction.CommandInvoked, error: ChatError) =>
  Effect.flatMap(ChatInteraction.Handler, (handler) => handler.refused(event, error))

/**
 * Where the message an invoke came from lives. A card posted as a channel
 * post has the channel as its address, as `normalize` gives it.
 */
const cardThread = (activity: JsonObject): ChatThread | undefined => {
  const conversationId = string(object(activity, "conversation"), "id")
  const messageId = string(activity, "replyToId")
  if (conversationId === undefined || conversationId.length > Address.maxIdLength) return undefined
  const parts = Address.parts(Address.thread(conversationId))
  if (Option.isNone(parts)) return undefined
  return parts.value.root !== undefined && parts.value.root === messageId
    ? Address.thread(parts.value.base)
    : Address.thread(conversationId)
}

/** The adaptive card of a dialog, built only from the signed definition. */
const dialogCard = (modal: ChatUi.Modal, token: string, errors?: Readonly<Record<string, string>>) => {
  const body: Array<unknown> = []
  for (const element of modal.elements) {
    if (element._tag === "Text") {
      body.push(Render.textBlock(Render.escapeText(Render.wellFormed(element.text))))
      continue
    }
    if (element._tag === "TextInput") {
      body.push({
        type: "Input.Text",
        id: element.id,
        label: element.label,
        isMultiline: element.multiline === true,
        isRequired: element.optional !== true,
        maxLength: element.maxLength ?? Envelope.defaultMaxLength,
        ...(element.placeholder === undefined ? {} : { placeholder: element.placeholder }),
        ...(element.initial === undefined ? {} : { value: element.initial })
      })
    } else {
      body.push({
        type: "Input.ChoiceSet",
        id: element.id,
        label: element.label,
        style: "compact",
        isRequired: element.optional !== true,
        choices: element.options.map((option) => ({ title: option.label, value: option.value })),
        ...(element.placeholder === undefined ? {} : { placeholder: element.placeholder }),
        ...(element.initial === undefined ? {} : { value: element.initial })
      })
    }
    const error = errors?.[element.id]
    if (error !== undefined) {
      body.push({ ...Render.textBlock(Render.escapeText(Render.wellFormed(error))), color: "attention" })
    }
  }
  return {
    task: {
      type: "continue",
      value: {
        title: modal.title,
        card: {
          contentType: Render.cardContentType,
          content: {
            ...Render.card(body),
            actions: [{
              type: "Action.Submit",
              title: modal.submitLabel ?? "Submit",
              data: { [Envelope.reservedKey]: token }
            }]
          }
        }
      }
    }
  }
}

const modalRefusal = (modal: ChatUi.Modal) => {
  const fields = modal.elements.length
  if (fields > modalFields) return Errors.tooLarge(undefined, "too_many_modal_fields")
  if (modal.id.length + (modal.metadata?.length ?? 0) > modalMetadataLength) {
    return Errors.tooLarge(undefined, "modal_metadata_too_long")
  }
  return Envelope.checkModal(modal)
}

/**
 * One verified invoke, or a card's `Action.Submit` fallback, which comes as
 * a `message` with a `value`.
 *
 * - `adaptiveCard/action` and the fallback are clicks. A click can't open
 *   a dialog there: an `OpenModal` goes to `Handler.refused` as
 *   `Unsupported`.
 * - `task/fetch` is a click on a button named in `modalButtons`, whose
 *   `OpenModal` opens the dialog, signed for the clicking user.
 * - `task/submit` is a dialog submit, checked against its signed
 *   definition.
 * - A token that does not verify, or values that do not match the
 *   definition, get the safe failure and dispatch nothing.
 *
 * @internal
 */
export const invoke = (
  activity: JsonObject,
  options: Options
): Effect.Effect<InvokeResponse, never, ChatInteraction.Handler> =>
  Effect.gen(function*() {
    const name = activity.type === "message" ? "message" : string(activity, "name") ?? ""
    const failure = safeFailure(name)
    const envelope = options.envelope
    if (envelope === undefined || !options.capabilities.has("buttons")) return failure
    const conversationId = string(object(activity, "conversation"), "id")
    const from = object(activity, "from")
    const user = from === undefined ? undefined : userId(from)
    if (conversationId === undefined || user === undefined) return failure
    const value = object(activity, "value")
    const data = name === "adaptiveCard/action"
      ? object(object(value, "action"), "data")
      : name === "message"
      ? value
      : object(value, "data")
    const token = data?.[Envelope.reservedKey]

    if (name === "task/submit") {
      if (!options.capabilities.has("modals")) return failure
      const dialog = yield* envelope.verifyDialog(token, { conversationId, userId: user })
      if (Option.isNone(dialog)) return failure
      const values = Envelope.validateSubmission(dialog.value.modal, data)
      const at = threadOf(activity)
      if (Option.isNone(values) || at === undefined) return failure
      const modal = dialog.value.modal
      const event = ChatInteraction.ModalSubmitted.make({
        id: modal.id,
        ...(modal.metadata === undefined ? {} : { metadata: modal.metadata }),
        values: values.value,
        thread: at.thread,
        ...(dialog.value.messageId === undefined ? {} : { messageId: dialog.value.messageId }),
        userId: user,
        raw: activity
      })
      const reply = yield* ChatInteraction.handle(event, options.deadline)
      if (isLate(reply)) return failure
      if (reply._tag === "Errors") {
        return { status: 200, body: dialogCard(modal, token as string, reply.errors) as Schema.Json }
      }
      return ok
    }

    if (name !== "adaptiveCard/action" && name !== "message" && name !== "task/fetch") return failure
    const button = yield* envelope.verifyButton(token, { conversationId })
    const thread = cardThread(activity)
    const messageId = string(activity, "replyToId")
    if (Option.isNone(button) || thread === undefined || messageId === undefined) return failure
    const opensDialog = name === "task/fetch"
    if (opensDialog !== options.modalButtons.has(button.value.id)) return failure
    const event = ChatInteraction.ButtonClicked.make({
      id: button.value.id,
      ...(button.value.value === undefined ? {} : { value: button.value.value }),
      thread,
      messageId,
      userId: user,
      raw: activity
    })
    const reply = yield* ChatInteraction.handle(event, options.deadline)
    const acked = name === "adaptiveCard/action" ? executeAck : name === "message" ? ok : failure
    if (isLate(reply) || reply._tag === "Ack") return acked
    if (!opensDialog || !options.capabilities.has("modals")) {
      yield* refused(event, Errors.chatError("openModal", Errors.unsupported("modals")))
      return acked
    }
    const refusal = modalRefusal(reply.modal)
    if (refusal !== undefined) {
      yield* refused(event, Errors.chatError("openModal", refusal))
      return failure
    }
    const signed = yield* Effect.result(
      envelope.signDialog(conversationId, { userId: user, messageId, modal: reply.modal })
    )
    if (signed._tag === "Failure") {
      yield* refused(event, Errors.chatError("openModal", signed.failure))
      return failure
    }
    return { status: 200, body: dialogCard(reply.modal, signed.success) as Schema.Json }
  })

/** Leading `<at>…</at>` tokens, spaces and one slash, before a command's name. */
const commandPrefix = /^(?:\s|<at>[^<]*<\/at>)*\/?/

/**
 * A verified targeted message. Its first word names the command, and the
 * rest is the command's `text`. A message whose first word names no
 * registered command is acked and nothing is sent. Nothing here ever
 * reaches `ChatHandler` or posts in public unless the handler asks.
 *
 * @internal
 */
export const command = (
  activity: JsonObject,
  options: Options & { readonly isRegistered: (id: string) => Effect.Effect<boolean> }
): Effect.Effect<void, never, ChatInteraction.Handler> =>
  Effect.gen(function*() {
    if (!options.capabilities.has("commands")) return
    const text = typeof activity.text === "string" ? activity.text : ""
    const rest = text.replace(commandPrefix, "")
    const match = /^(\S+)\s*([\s\S]*)$/.exec(rest)
    const from = object(activity, "from")
    const user = from === undefined ? undefined : userId(from)
    const at = threadOf(activity)
    if (match === null || user === undefined || at === undefined) return
    const id = match[1]
    if (!(yield* options.isRegistered(id))) return
    const event = ChatInteraction.CommandInvoked.make({
      id,
      text: match[2],
      thread: at.thread,
      userId: user,
      raw: activity
    })
    const reply = yield* ChatInteraction.handle(event, options.deadline)
    if (isLate(reply)) return
    switch (reply._tag) {
      case "Ack":
      case "Defer":
        return
      case "OpenModal":
        return yield* refused(event, Errors.chatError("openModal", Errors.unsupported("modals")))
      case "Respond":
        return yield* options.answer("respond", activity, {
          markdown: reply.markdown,
          ...(reply.actions === undefined ? {} : { actions: reply.actions })
        }, reply.visibility).pipe(Effect.catch((error) => refused(event, error)))
    }
  })

/** Whether a `message` is a card's `Action.Submit` fallback. @internal */
export const isSubmitFallback = (activity: JsonObject): boolean =>
  activity.type === "message" && isObject(activity.value) && Envelope.reservedKey in activity.value
