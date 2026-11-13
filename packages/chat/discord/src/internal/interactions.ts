import type * as Discord from "dfx/types"
import type { ChatErrorReason } from "effect/chat/ChatError"
import { InvalidRequest, TooLarge } from "effect/chat/ChatError"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import type * as ChatUi from "effect/chat/ChatUi"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { codePoints, cut, messageLength } from "./length.ts"
import * as Normalize from "./normalize.ts"

/**
 * The one character between an id and its value in a `custom_id`, for a
 * button and for a modal's metadata. An id may not hold it, so the first one
 * in a `custom_id` is the join.
 *
 * @internal
 */
export const join = "\u241F"

/** @internal */
export const limits = {
  actionsPerMessage: 25,
  actionDataLength: 99,
  modalMetadataLength: 99,
  modalFields: 5
} as const

/** Discord's limits on rows, a row's buttons, a modal's title and an input's label. */
const rowsPerMessage = 5
const buttonsPerRow = 5
const titleLength = 45
const labelLength = 45

/** Discord's interaction callback types. */
const DEFERRED_UPDATE_MESSAGE = 6
const CHANNEL_MESSAGE_WITH_SOURCE = 4
const MODAL = 9
const EPHEMERAL = 1 << 6

/** `custom_id` for an id and an optional value. */
const customId = (id: string, value: string | undefined): string => value === undefined ? id : id + join + value

/** An id and its value from a `custom_id`, split at the first join. */
const splitCustomId = (customId: string): { readonly id: string; readonly value?: string } => {
  const at = customId.indexOf(join)
  return at === -1 ? { id: customId } : { id: customId.slice(0, at), value: customId.slice(at + 1) }
}

const buttonStyle = (style: ChatUi.ButtonStyle | undefined): Discord.ButtonStyleTypes =>
  style === "primary" ? 1 : style === "danger" ? 4 : 2

type Row = Discord.ActionRowComponentForMessageRequest
type Component = Row["components"][number]

/**
 * A message's elements as action rows, or why they can't go: five buttons to
 * a row and a select alone in its row, in the order given, up to five rows.
 *
 * @internal
 */
export const rows = (actions: ReadonlyArray<ChatUi.Action>): Array<Row> | ChatErrorReason => {
  if (actions.length > limits.actionsPerMessage) return new TooLarge({ detail: "too_many_actions" })
  const out: Array<{ type: 1; components: Array<Component> }> = []
  let open: Array<Component> | undefined
  for (const action of actions) {
    switch (action._tag) {
      case "Button":
      case "LinkButton": {
        if (action._tag === "Button") {
          if (action.id.includes(join)) return new InvalidRequest({ detail: "invalid_action_id" })
          if (codePoints(action.id) + codePoints(action.value ?? "") > limits.actionDataLength) {
            return new TooLarge({ detail: "action_data_too_long" })
          }
        }
        const button: Component = action._tag === "Button"
          ? {
            type: 2,
            style: buttonStyle(action.style),
            label: action.label,
            custom_id: customId(action.id, action.value)
          }
          : { type: 2, style: 5, label: action.label, url: action.url }
        if (open === undefined || open.length === buttonsPerRow) {
          open = [button]
          out.push({ type: 1, components: open })
        } else {
          open.push(button)
        }
        break
      }
      case "Select": {
        const id = codePoints(action.id)
        if (action.options.some((option) => id + codePoints(option.value) > limits.actionDataLength)) {
          return new TooLarge({ detail: "action_data_too_long" })
        }
        open = undefined
        out.push({
          type: 1,
          components: [{
            type: 3,
            custom_id: action.id,
            ...(action.placeholder === undefined ? {} : { placeholder: action.placeholder }),
            options: action.options.map((option) => ({
              label: option.label,
              value: option.value,
              ...(option.value === action.selected ? { default: true } : {})
            })),
            min_values: 1,
            max_values: 1
          }]
        })
        break
      }
    }
  }
  return out.length > rowsPerMessage ? new TooLarge({ detail: "too_many_actions" }) : out
}

/**
 * Discord's Markdown escape for any ASCII punctuation, so a modal's text
 * shows as written.
 */
const plain = (text: string): string => text.replace(/[!-/:-@[-`{-~]/g, "\\$&")

type ModalData = Discord.ModalInteractionCallbackRequestData

/**
 * The callback data that opens `modal`, or why it can't open. Inputs are
 * Label components around a text input or a string select, and a `Text` is
 * a text display. Discord has no submit label, so `submitLabel` is not sent.
 *
 * @internal
 */
export const modalData = (modal: ChatUi.Modal): ModalData | ChatErrorReason => {
  if (modal.id.includes(join)) return new InvalidRequest({ detail: "invalid_modal_id" })
  if (codePoints(modal.id) + codePoints(modal.metadata ?? "") > limits.modalMetadataLength) {
    return new TooLarge({ detail: "modal_metadata_too_long" })
  }
  if (modal.elements.length > limits.modalFields) return new TooLarge({ detail: "too_many_fields" })
  if (codePoints(modal.title) > titleLength) return new TooLarge({ detail: "title_too_long" })
  const components: Array<ModalData["components"][number]> = []
  for (const element of modal.elements) {
    if (element._tag === "Text") {
      components.push({ type: 10, content: plain(element.text) })
      continue
    }
    if (codePoints(element.label) > labelLength) return new TooLarge({ detail: "label_too_long" })
    const required = element.optional !== true
    components.push({
      type: 18,
      label: element.label,
      component: element._tag === "TextInput"
        ? {
          type: 4,
          custom_id: element.id,
          style: element.multiline === true ? 2 : 1,
          required,
          ...(element.placeholder === undefined ? {} : { placeholder: element.placeholder }),
          ...(element.initial === undefined ? {} : { value: element.initial }),
          ...(element.minLength === undefined ? {} : { min_length: element.minLength }),
          ...(element.maxLength === undefined ? {} : { max_length: element.maxLength })
        }
        : {
          type: 3,
          custom_id: element.id,
          required,
          min_values: required ? 1 : 0,
          max_values: 1,
          ...(element.placeholder === undefined ? {} : { placeholder: element.placeholder }),
          options: element.options.map((option) => ({
            label: option.label,
            value: option.value,
            ...(option.value === element.initial ? { default: true } : {})
          }))
        }
    })
  }
  return { custom_id: customId(modal.id, modal.metadata), title: modal.title, components }
}

type Callback = Discord.CreateInteractionResponseRequest

/** @internal */
export const ackCallback: Callback = { type: DEFERRED_UPDATE_MESSAGE }

/** @internal */
export const modalCallback = (data: ModalData): Callback => ({ type: MODAL, data })

/**
 * The answer to an `errors` reply: a private message listing each one, as
 * plain text, cut to fit one message. The modal closes.
 *
 * @internal
 */
export const errorsCallback = (errors: Readonly<Record<string, string>>): Callback => ({
  type: CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    content: cut(Object.values(errors).map((message) => "- " + plain(message)).join("\n"), messageLength),
    allowed_mentions: { parse: [] },
    flags: EPHEMERAL
  }
})

// Inbound

const optional = <S extends Schema.Top>(schema: S) => Schema.optionalKey(Schema.NullOr(schema))

const Input = Schema.Struct({
  type: Schema.Number,
  custom_id: optional(Schema.String),
  value: optional(Schema.String),
  values: optional(Schema.Array(Schema.String))
})

const ModalComponent = Schema.Struct({
  type: Schema.Number,
  component: optional(Input),
  components: optional(Schema.Array(Input))
})

const InteractionFields = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  token: Schema.String,
  channel_id: optional(Schema.String),
  member: optional(Schema.Struct({ user: optional(Schema.Struct({ id: Schema.String })) })),
  user: optional(Schema.Struct({ id: Schema.String })),
  message: optional(Schema.Struct({ id: Schema.String, channel_id: optional(Schema.String) })),
  data: Schema.Struct({
    custom_id: Schema.String,
    component_type: optional(Schema.Number),
    values: optional(Schema.Array(Schema.String)),
    components: optional(Schema.Array(ModalComponent))
  })
})

const decodeFields = Schema.decodeUnknownOption(InteractionFields)

/** Discord's interaction types for a component click and a modal submit. */
const MESSAGE_COMPONENT = 3
const MODAL_SUBMIT = 5

/**
 * The id and token to answer an interaction with, read from its payload.
 *
 * @internal
 */
export const answerTo = (raw: unknown): { readonly id: string; readonly token: string } | undefined =>
  Option.getOrUndefined(Option.map(decodeFields(raw), ({ id, token }) => ({ id, token })))

/**
 * The interaction a payload is, when it is a click on a button or string
 * select, or a submit of a modal opened from a message. Anything else, a
 * slash command for one, is none.
 *
 * @internal
 */
export const normalize = (raw: unknown): Option.Option<ChatInteraction.Interaction> => {
  const decoded = decodeFields(raw)
  if (Option.isNone(decoded)) return Option.none()
  const fields = decoded.value
  const message = fields.message
  const userId = fields.member?.user?.id ?? fields.user?.id
  const channelId = message?.channel_id ?? fields.channel_id
  if (
    message === null || message === undefined || userId === undefined || channelId === null || channelId === undefined
  ) {
    return Option.none()
  }
  const origin = { thread: Normalize.thread(channelId), messageId: message.id, userId, raw: raw as Schema.Json }
  const { data } = fields
  if (fields.type === MESSAGE_COMPONENT && data.component_type === 2) {
    const { id, value } = splitCustomId(data.custom_id)
    return Option.some(ChatInteraction.ButtonClicked.make({ id, ...(value === undefined ? {} : { value }), ...origin }))
  }
  if (fields.type === MESSAGE_COMPONENT && data.component_type === 3) {
    const value = data.values?.[0]
    return value === undefined
      ? Option.none()
      : Option.some(ChatInteraction.SelectChanged.make({ id: data.custom_id, value, ...origin }))
  }
  if (fields.type === MODAL_SUBMIT) {
    const values: Record<string, string> = {}
    for (const component of data.components ?? []) {
      const inputs = component.component === null || component.component === undefined
        ? component.components ?? []
        : [component.component]
      for (const input of inputs) {
        const value = input.value ?? input.values?.[0]
        if (typeof input.custom_id === "string" && value !== null && value !== undefined && value !== "") {
          values[input.custom_id] = value
        }
      }
    }
    const { id, value: metadata } = splitCustomId(data.custom_id)
    return Option.some(ChatInteraction.ModalSubmitted.make({
      id,
      ...(metadata === undefined ? {} : { metadata }),
      values,
      ...origin
    }))
  }
  return Option.none()
}
