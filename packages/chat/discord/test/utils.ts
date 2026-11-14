import * as DiscordChat from "@effect/chat-discord/DiscordChat"
import { DiscordREST } from "dfx/DiscordREST"
import * as Chat from "effect/chat/Chat"
import type { ChatAdapter } from "effect/chat/ChatAdapter"
import { Registry } from "effect/chat/ChatAdapter"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as fs from "node:fs"

/** The Janitor application the fixtures were recorded with. */
export const botUserId = "1564742987727118426"
export const tim = "449108784879763458"
export const guild = "840178841540362250"
export const scratch = "1570607253965246584"
export const forum = "1570607255684915302"
export const test = "1570605581192929301"
export const role = "1570607256838479964"
export const webhook = "1570607260156297307"

export const checkOptions = { platform: "discord", parseMention: DiscordChat.parseMention }

export interface Dispatch {
  readonly receivedAt?: string
  readonly t: string
  readonly d: any
}

/** The dispatches of a gateway fixture in `fixtures/events`. */
export const events = (name: string): ReadonlyArray<Dispatch> =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/events/${name}.json`, import.meta.url), "utf8")).dispatches

export const eventFixtures = (): ReadonlyArray<string> =>
  fs.readdirSync(new URL("./fixtures/events", import.meta.url)).map((file) => file.replace(/\.json$/, ""))

export interface RecordedCall {
  readonly step: string
  readonly method: string
  readonly path: string
  readonly request: any
  readonly status: number
  readonly response: any
}

/** The REST calls of a fixture in `fixtures/recorded`. */
/**
 * The slash commands recorded in EFF-3802, `fixtures/recorded/commands.json`.
 * The built command payloads start from these.
 */
export const recordedCommands: any = JSON.parse(
  fs.readFileSync(new URL("./fixtures/recorded/commands.json", import.meta.url), "utf8")
)

export const recorded = (name: string): ReadonlyArray<RecordedCall> =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/recorded/${name}.json`, import.meta.url), "utf8")).calls

/** The one recorded call for `step`. */
export const step = (name: string, stepName: string): RecordedCall => {
  const found = recorded(name).filter((call) => call.step === stepName)
  if (found.length !== 1) throw new Error(`${name}/${stepName}: ${found.length} calls`)
  return found[0]
}

/** What dfx fails with for a 4xx answer, as the adapter reads it. */
export const errorResponse = (status: number, data: unknown) => ({
  _tag: status === 429 ? "RatelimitedResponse" : "ErrorResponse",
  data,
  response: { status },
  message: JSON.stringify(data)
})

/** What dfx fails with for a 5xx answer. */
export const statusCodeError = (status: number) => ({
  _tag: "HttpClientError",
  reason: { _tag: "StatusCodeError", response: { status } }
})

/** A recorded call as the fake's answer: its body, or dfx's error for it. */
export const answer = (call: RecordedCall): Effect.Effect<any, unknown> =>
  call.status >= 400 ? Effect.fail(errorResponse(call.status, call.response)) : Effect.succeed(call.response)

type Handler = (...args: Array<any>) => Effect.Effect<any, unknown>

export interface Fake {
  readonly calls: Array<{ readonly method: string; readonly args: ReadonlyArray<any>; readonly files?: number }>
  readonly called: (method: string) => ReadonlyArray<ReadonlyArray<any>>
  readonly service: DiscordREST["Service"]
}

/**
 * A `DiscordREST` that answers from `handlers` and records every call. A
 * method with no handler dies, so a test sees any call it didn't expect.
 */
export const makeFake = (handlers: Record<string, Handler>): Fake => {
  const calls: Array<{ method: string; args: ReadonlyArray<any>; files?: number }> = []
  let files: number | undefined
  const service = new Proxy({}, {
    get: (_, method: string) => {
      if (method === "withFiles") {
        return (list: ReadonlyArray<unknown>) => (effect: Effect.Effect<any, any>) =>
          Effect.suspend(() => {
            files = list.length
            return Effect.ensuring(effect, Effect.sync(() => (files = undefined)))
          })
      }
      return (...args: Array<any>) =>
        Effect.suspend(() => {
          calls.push({ method, args, ...(files === undefined ? {} : { files }) })
          const handler = handlers[method]
          return handler === undefined ? Effect.die(new Error(`unexpected ${method}`)) : handler(...args)
        })
    }
  }) as DiscordREST["Service"]
  return {
    calls,
    called: (method) => calls.filter((call) => call.method === method).map((call) => call.args),
    service
  }
}

const getMyUser = () => Effect.succeed({ id: botUserId, username: "Janitor", bot: true })

const originalResponse = /\/webhooks\/([^/]+)\/([^/]+)\/messages\/@original$/

/**
 * The fake's `updateOriginalWebhookMessage` as Discord's HTTP answer, for
 * `followUp`, which sends over the plain `HttpClient`.
 */
const webhookEdit = (fake: Fake, request: HttpClientRequest.HttpClientRequest, path: RegExpExecArray) =>
  fake.service.updateOriginalWebhookMessage(decodeURIComponent(path[1]), decodeURIComponent(path[2]), {
    payload: request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined
  }).pipe(
    Effect.match({
      onSuccess: (body) => Response.json(body),
      onFailure: (error: any) => Response.json(error.data ?? {}, { status: error.response.status })
    }),
    Effect.map((response) => HttpClientResponse.fromWeb(request, response))
  )

/**
 * `DiscordChat.layer` over a fake, with `Chat` and an `HttpClient` that
 * answers `download`, and an original response's edit from the fake.
 */
export const discordLayer = (fake: Fake, options?: { readonly download?: Uint8Array | undefined }) =>
  DiscordChat.layer.pipe(
    Layer.provideMerge(Chat.layer),
    Layer.provide(Layer.succeed(
      DiscordREST,
      new Proxy(fake.service, {
        get: (target, key) => key === "getMyUser" ? getMyUser : (target as any)[key]
      })
    )),
    Layer.provide(Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) => {
        const path = request.method === "PATCH" ? originalResponse.exec(request.url) : null
        return path !== null
          ? webhookEdit(fake, request, path)
          : Effect.succeed(HttpClientResponse.fromWeb(request, new Response(new Uint8Array(options?.download ?? []))))
      })
    ))
  )

export const adapter: Effect.Effect<ChatAdapter, unknown, Registry> = Effect.gen(function*() {
  const registry = yield* Registry
  return yield* registry.get("discord")
})
