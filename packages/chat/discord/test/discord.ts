import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { type Interactions, NoSuchElement } from "effect/chat/ChatTest"
import * as Effect from "effect/Effect"
import { answer, botUserId, errorResponse, type Fake, guild, makeFake, step, tim } from "./utils.ts"

/** The join between an id and its value in a `custom_id`, as the adapter writes it. */
const join = "\u241F"

const idOf = (customId: string): string => customId.split(join)[0]

/**
 * A Discord that keeps the messages the adapter posts, with their
 * components, and records every interaction callback. `interactions` is the
 * conformance hook: it builds Discord's `INTERACTION_CREATE` payload from
 * what was posted and sends it through `DiscordChat.interaction`.
 */
export const makeDiscord = (channelType = 0) => {
  const messages = new Map<string, any>()
  const callbacks: Array<{ readonly id: string; readonly token: string; readonly payload: any }> = []
  let next = 1570700000000000000n
  let refuse = 0
  let interactionCount = 0
  const nextId = () => String(next++)

  const unknownMessage = () => Effect.fail(errorResponse(404, { code: 10008, message: "Unknown Message" }))

  const fake: Fake = makeFake({
    getChannel: (id: string) => Effect.succeed({ id, type: channelType, guild_id: guild, name: "scratch" }),
    createMessage: (channelId: string, body: any) => {
      if ((body.attachments ?? []).length > 0 && refuse > 0) {
        refuse--
        // Discord's answer to an oversize upload, from fixtures/recorded/uploads.json.
        return answer(step("uploads", "upload-20MiB-plus-1"))
      }
      const id = nextId()
      const message = {
        id,
        channel_id: channelId,
        type: 0,
        content: body.content,
        timestamp: new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString(),
        author: { id: botUserId, username: "Janitor", bot: true },
        attachments: [],
        components: body.components ?? []
      }
      messages.set(id, message)
      return Effect.succeed(message)
    },
    updateMessage: (_channelId: string, id: string, body: any) => {
      const message = messages.get(id)
      if (message === undefined) return unknownMessage()
      message.content = body.content
      if (body.components !== undefined) message.components = body.components
      return Effect.succeed(message)
    },
    getMessage: (_channelId: string, id: string) => {
      const message = messages.get(id)
      return message === undefined ? unknownMessage() : Effect.succeed(message)
    },
    deleteMessage: (_channelId: string, id: string) =>
      messages.delete(id) ? Effect.succeed(undefined) : unknownMessage(),
    listMessages: (channelId: string, params: { after?: string; before?: string; limit: number }) =>
      Effect.succeed(
        [...messages.values()]
          .filter((message) =>
            message.channel_id === channelId &&
            (params.after === undefined || BigInt(message.id) > BigInt(params.after)) &&
            (params.before === undefined || BigInt(message.id) < BigInt(params.before))
          )
          .sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1))
          .slice(0, params.limit)
      ),
    createInteractionResponse: (id: string, token: string, options: { payload: any }) => {
      callbacks.push({ id, token, payload: options.payload })
      return Effect.succeed(null)
    }
  })

  /** The modal the last click opened, with the message it was opened from. */
  let opened: { readonly data: any; readonly message: any } | undefined

  /** The service the hook delivers through, set by `bind`. */
  let service: DiscordChat.DiscordChat["Service"] | undefined

  const deliver = Effect.fnUntraced(function*(payload: Record<string, unknown>) {
    const before = callbacks.length
    yield* service!.interaction(payload)
    return callbacks.slice(before).find((callback) => callback.id === payload.id)?.payload
  })

  const base = (message: any) => {
    const n = ++interactionCount
    return {
      id: "9" + String(n).padStart(18, "0"),
      application_id: botUserId,
      token: "token-" + n,
      version: 1,
      channel_id: message.channel_id,
      guild_id: guild,
      member: { user: { id: tim, username: "tim" }, roles: [] },
      message
    }
  }

  /** The conformance hook. It delivers through the service `bind` saw last. */
  const interactions: Interactions = {
    click: Effect.fnUntraced(function*(messageId, id, options) {
      const message = messages.get(messageId)
      const component = (message?.components ?? [])
        .flatMap((row: any) => row.components)
        .find((component: any) => typeof component.custom_id === "string" && idOf(component.custom_id) === id)
      if (component === undefined) return yield* Effect.fail(new NoSuchElement({ messageId, id }))
      const value = component.type === 3 ? options?.option ?? component.options[0].value : undefined
      const answer = yield* deliver({
        ...base(message),
        type: 3,
        data: {
          custom_id: component.custom_id,
          component_type: component.type,
          ...(value === undefined ? {} : { values: [value] })
        }
      })
      opened = answer?.type === 9 ? { data: answer.data, message } : undefined
    }),
    submit: Effect.fnUntraced(function*(values) {
      if (opened === undefined) return
      const { data, message } = opened
      const components = data.components.map((component: any) => {
        if (component.type !== 18) return { type: component.type }
        const input = component.component
        const value = values[input.custom_id]
        return {
          type: 18,
          component: input.type === 4
            ? { type: 4, custom_id: input.custom_id, value: value ?? "" }
            : { type: 3, custom_id: input.custom_id, values: value === undefined ? [] : [value] }
        }
      })
      yield* deliver({
        ...base(message),
        type: 5,
        data: { custom_id: data.custom_id, components }
      })
      // Discord closes the modal on every answer, `errors` included.
      opened = undefined
    })
  }

  return {
    fake,
    bind: Effect.tap(DiscordChat.DiscordChat, (discord) =>
      Effect.sync(() => {
        service = discord
      })),
    messages,
    callbacks,
    interactions,
    refuseFiles: () =>
      Effect.sync(() => {
        refuse++
      })
  }
}
