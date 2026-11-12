import * as SlackChat from "@effect/chat-slack/SlackChat"
import * as Chat from "effect/chat/Chat"
import type { ChatAdapter } from "effect/chat/ChatAdapter"
import { Registry } from "effect/chat/ChatAdapter"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as fs from "node:fs"

export const team = "T05479Z6JBW"
export const botUserId = "U0CCLMD4S1L"
export const appId = "A0CCHBHDK7X"
export const channel = "C0CH1LGJ4F3"

export const checkOptions = { platform: "slack", parseMention: SlackChat.parseMention }

export interface RecordedCall {
  readonly method: string
  readonly label?: string
  readonly request: Record<string, unknown>
  readonly response: any
}

export const fixture = (name: string): { readonly calls: ReadonlyArray<RecordedCall>; readonly [key: string]: any } =>
  JSON.parse(fs.readFileSync(new URL(`./fixtures/recorded/${name}.json`, import.meta.url), "utf8"))

/** Every message object a fixture's reads returned, by ts. */
export const recordedMessages = (name: string): Map<string, any> => {
  const out = new Map<string, any>()
  for (const call of fixture(name).calls) {
    const messages = call.response?.messages
    if (Array.isArray(messages)) { for (const message of messages) out.set(message.ts, message) }
  }
  return out
}

/**
 * An `event_callback` envelope built around a message as a Web API read
 * returned it. Reconstructed, not delivered by Slack: the captured
 * deliveries are in `fixtures/events`.
 */
export const messageEnvelope = (
  message: Record<string, unknown>,
  options?: {
    readonly type?: "message" | "app_mention" | undefined
    readonly channel?: string | undefined
    readonly channelType?: string | undefined
    readonly teamId?: string | undefined
  }
) => ({
  token: "verification-token",
  team_id: options?.teamId ?? team,
  api_app_id: appId,
  type: "event_callback",
  event_id: "Ev01",
  event_time: 1794509000,
  authorizations: [{ team_id: options?.teamId ?? team, user_id: botUserId, is_bot: true }],
  event: {
    ...message,
    type: options?.type ?? "message",
    channel: options?.channel ?? channel,
    ...(options?.type === "app_mention" ? {} : { channel_type: options?.channelType ?? "channel" }),
    event_ts: message.ts
  }
})

export interface FakeCall {
  readonly method: string
  readonly params: Record<string, string>
}

export type Answer =
  | Record<string, unknown>
  | { readonly status: number; readonly headers?: Record<string, string>; readonly body?: unknown }

/**
 * A scripted Slack. Each method answers from a queue of answers, the last
 * one repeating, or `{ ok: true }` when it has none.
 */
export const makeFake = (
  script: Record<string, Answer | ReadonlyArray<Answer> | ((params: Record<string, string>) => Answer)>
) => {
  const calls: Array<FakeCall> = []
  const queues = new Map<string, Array<Answer>>()
  for (const [method, answer] of Object.entries(script)) {
    if (Array.isArray(answer)) queues.set(method, [...answer])
  }
  const respond = (request: HttpClientRequest.HttpClientRequest, url: URL): Response => {
    const method = url.pathname.replace(/^\/api\//, "")
    const body = request.body
    const text = body._tag === "Uint8Array" ? body.text ?? new TextDecoder().decode(body.body) : ""
    const params = Object.fromEntries(new URLSearchParams(text))
    calls.push({ method, params })
    const entry = script[method]
    let answer: Answer
    if (typeof entry === "function") answer = entry(params)
    else if (Array.isArray(entry)) {
      const queue = queues.get(method)!
      answer = queue.length > 1 ? queue.shift()! : queue[0]
    } else answer = (entry as Answer | undefined) ?? { ok: true }
    if ("status" in answer && typeof answer.status === "number") {
      const { body, headers, status } = answer as Extract<Answer, { readonly status: number }>
      return new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: headers ?? {} })
    }
    return new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } })
  }
  const client = HttpClient.make((request, url) =>
    Effect.sync(() => HttpClientResponse.fromWeb(request, respond(request, url)))
  )
  return {
    calls,
    called: (method: string) => calls.filter((call) => call.method === method),
    layer: Layer.succeed(HttpClient.HttpClient, client)
  }
}

export const authTest = { ok: true, user_id: botUserId, team_id: team }

/** `Chat`, `Registry` and the Slack adapter on a fake. */
export const slackLayer = (fake: ReturnType<typeof makeFake>) =>
  SlackChat.layer({ botToken: Redacted.make("xoxb-test"), teamId: team }).pipe(
    Layer.provideMerge(Chat.layer),
    Layer.provide(fake.layer)
  )

export const adapter: Effect.Effect<ChatAdapter, unknown, Registry> = Effect.gen(function*() {
  const registry = yield* Registry
  return yield* registry.get("slack")
})
