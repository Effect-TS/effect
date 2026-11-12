import type { ChatError } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import type { NotAccepted } from "effect/chat/ChatHandler"
import * as Clock from "effect/Clock"
import { WebCrypto } from "effect/crypto/WebCrypto"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import { normalize } from "./normalize.ts"

/** How far a request's timestamp may be from now, as Slack recommends. */
const maxSkewSeconds = 60 * 5

const encoder = new TextEncoder()

const toHex = (bytes: Uint8Array): string => {
  let out = ""
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0")
  return out
}

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Checks Slack's `v0` request signature: an HMAC-SHA256 of
 * `v0:{timestamp}:{body}` with the signing secret, and a timestamp within
 * five minutes of now.
 *
 * @internal
 */
export const makeVerifier = Effect.fnUntraced(function*(signingSecret: Redacted.Redacted) {
  const crypto = yield* WebCrypto
  const key = yield* Effect.promise(() =>
    crypto.subtle.importKey(
      "raw",
      encoder.encode(Redacted.value(signingSecret)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
  )
  return (headers: { readonly [key: string]: string | undefined }, body: Uint8Array): Effect.Effect<boolean> =>
    Effect.gen(function*() {
      const timestamp = headers["x-slack-request-timestamp"]
      const signature = headers["x-slack-signature"]
      if (timestamp === undefined || signature === undefined || !/^\d+$/.test(timestamp)) return false
      const now = yield* Clock.currentTimeMillis
      if (Math.abs(now / 1000 - Number(timestamp)) > maxSkewSeconds) return false
      const prefix = encoder.encode(`v0:${timestamp}:`)
      const message = new Uint8Array(prefix.length + body.length)
      message.set(prefix)
      message.set(body, prefix.length)
      const mac = yield* Effect.promise(() => crypto.subtle.sign("HMAC", key, message))
      return timingSafeEqual(`v0=${toHex(new Uint8Array(mac))}`, signature)
    })
})

/** The body, or `None` once it passes `maxBytes`. @internal */
export const readBody = (
  request: HttpServerRequest.HttpServerRequest,
  maxBytes: number
): Effect.Effect<Option.Option<Uint8Array>> => {
  const length = request.headers["content-length"]
  if (length !== undefined && Number(length) > maxBytes) return Effect.succeed(Option.none())
  return Effect.gen(function*() {
    const chunks: Array<Uint8Array> = []
    let total = 0
    const tooLarge = yield* request.stream.pipe(
      Stream.takeUntil((chunk) => {
        total += chunk.length
        chunks.push(chunk)
        return total > maxBytes
      }),
      Stream.runDrain,
      Effect.as(false),
      Effect.catch(() => Effect.succeed(true))
    )
    if (tooLarge || total > maxBytes) return Option.none()
    const body = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.length
    }
    return Option.some(body)
  })
}

const isObject = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

const ok = HttpServerResponse.empty({ status: 200 })
const status = (code: number) => HttpServerResponse.empty({ status: code })

/** @internal */
export interface Options {
  readonly verify: (headers: { readonly [key: string]: string | undefined }, body: Uint8Array) => Effect.Effect<boolean>
  readonly appId: string
  readonly teamId: string
  readonly botUserId: Effect.Effect<string, ChatError>
  readonly handle: (event: ChatEvent.ChatEvent) => Effect.Effect<void, NotAccepted>
  readonly deadline: Duration.Duration
  readonly maxBodyBytes: number
}

/**
 * One Events API request.
 *
 * - 413 past the body limit, 401 for a bad signature, 400 for a body that
 *   is not JSON.
 * - `url_verification` is answered with its challenge.
 * - An envelope for another app or workspace, or of another type, is
 *   answered 200 and dropped, so Slack does not retry it.
 * - 503 when the bot user can't be read, the handler fails `NotAccepted`,
 *   or reading the bot user and running the handler take longer than the
 *   deadline. Slack then retries.
 *
 * @internal
 */
export const handleRequest = (
  request: HttpServerRequest.HttpServerRequest,
  options: Options
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.gen(function*() {
    const body = yield* readBody(request, options.maxBodyBytes)
    if (Option.isNone(body)) return status(413)
    if (!(yield* options.verify(request.headers, body.value))) return status(401)
    let envelope: unknown
    try {
      envelope = JSON.parse(new TextDecoder().decode(body.value))
    } catch {
      return status(400)
    }
    if (!isObject(envelope)) return status(400)
    if (envelope.type === "url_verification") {
      return typeof envelope.challenge === "string"
        ? HttpServerResponse.text(envelope.challenge)
        : status(400)
    }
    if (envelope.type !== "event_callback" || envelope.api_app_id !== options.appId) return ok
    const callback = envelope
    // The deadline covers the bot user lookup as well as the handlers.
    const handled = yield* Effect.gen(function*() {
      const botUserId = yield* Effect.option(options.botUserId)
      if (Option.isNone(botUserId)) return false
      const events = normalize(callback, { teamId: options.teamId, botUserId: botUserId.value })
      yield* Effect.forEach(events, options.handle, { discard: true })
      return true
    }).pipe(
      Effect.timeoutOption(options.deadline),
      Effect.map((done) => Option.isSome(done) && done.value),
      Effect.catchTag("NotAccepted", () => Effect.succeed(false))
    )
    return handled ? ok : status(503)
  })
