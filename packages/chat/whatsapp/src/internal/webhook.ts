import { Unsupported } from "effect/chat/ChatError"
import type * as ChatEvent from "effect/chat/ChatEvent"
import type { NotAccepted } from "effect/chat/ChatHandler"
import * as ChatInteraction from "effect/chat/ChatInteraction"
import * as Clock from "effect/Clock"
import * as Mac from "effect/crypto/Mac"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import type { WhatsAppUpdate } from "../WhatsAppUpdate.ts"
import { chatError } from "./errors.ts"
import { groupMessages, type Inbound } from "./normalize.ts"

const encoder = new TextEncoder()

/**
 * Checks Meta's `X-Hub-Signature-256`: `sha256=` and the hex HMAC-SHA256
 * of the raw body with the app secret.
 *
 * @internal
 */
export const makeVerifier = Effect.fnUntraced(function*(appSecret: Redacted.Redacted) {
  const mac = yield* Mac.Mac
  // An invalid app secret is a configuration defect, not a route error.
  const key = yield* Mac.key(Mac.hmacSha256, encoder.encode(Redacted.value(appSecret))).pipe(Effect.orDie)
  return (headers: { readonly [key: string]: string | undefined }, body: Uint8Array): Effect.Effect<boolean> => {
    const signature = headers["x-hub-signature-256"]
    if (signature === undefined || !/^sha256=(?:[0-9a-fA-F]{2})+$/.test(signature)) return Effect.succeed(false)
    const hex = signature.slice(7)
    const tag = new Uint8Array(hex.length / 2)
    for (let i = 0; i < tag.length; i++) tag[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    // Crypto failures fail closed, like a mismatched signature.
    return mac.verify(key, tag, body).pipe(Effect.catch(() => Effect.succeed(false)))
  }
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
    const failed = yield* request.stream.pipe(
      Stream.takeUntil((chunk) => {
        total += chunk.length
        chunks.push(chunk)
        return total > maxBytes
      }),
      Stream.runDrain,
      Effect.as(false),
      Effect.catch(() => Effect.succeed(true))
    )
    if (failed || total > maxBytes) return Option.none()
    const body = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.length
    }
    return Option.some(body)
  })
}

const ok = HttpServerResponse.empty({ status: 200 })
const status = (code: number) => HttpServerResponse.empty({ status: code })

/** What is logged with each 503, and with a dropped delivery. @internal */
export const logged = {
  notAccepted: "whatsapp webhook: an update was refused, answered 503",
  deadline: "whatsapp webhook: the request passed its deadline, answered 503",
  noHandler: "whatsapp webhook: a click arrived with no ChatInteraction.Handler, dropped",
  group: "whatsapp webhook: group messages are not supported, dropped"
} as const

/**
 * Meta's subscription check: `hub.mode=subscribe` with the verify token is
 * answered with `hub.challenge`, anything else 403.
 *
 * @internal
 */
export const handleVerification = (
  request: HttpServerRequest.HttpServerRequest,
  verifyToken: Redacted.Redacted
): HttpServerResponse.HttpServerResponse => {
  const params = new URL(request.url, "http://localhost").searchParams
  const challenge = params.get("hub.challenge")
  return params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === Redacted.value(verifyToken) &&
      challenge !== null
    ? HttpServerResponse.text(challenge)
    : status(403)
}

/** @internal */
export interface ReceiveOptions {
  readonly handle: (event: ChatEvent.ChatEvent) => Effect.Effect<void, NotAccepted>
  readonly onUpdate?: ((update: WhatsAppUpdate) => Effect.Effect<void, NotAccepted>) | undefined
  /** How long the click about to run may take. */
  readonly clickDeadline: Effect.Effect<Duration.Duration>
}

/**
 * Runs one delivery's updates in order. A `NotAccepted` stops the rest.
 * A click never fails: `Ack` and `Late` count as handled, and
 * `OpenModal` is refused with `Unsupported("modals")`.
 *
 * @internal
 */
export const receive = (
  items: ReadonlyArray<Inbound>,
  options: ReceiveOptions
): Effect.Effect<void, NotAccepted> =>
  Effect.forEach(items, (item): Effect.Effect<void, NotAccepted> => {
    switch (item._tag) {
      case "MessageCreated":
      case "ReactionAdded":
        return options.handle(item)
      case "Status":
      case "UserIdChanged":
      case "Alias":
        return options.onUpdate === undefined ? Effect.void : options.onUpdate(item)
      case "ButtonClicked":
      case "SelectChanged":
        return Effect.flatMap(Effect.serviceOption(ChatInteraction.Handler), (handler) => {
          if (Option.isNone(handler)) return Effect.logWarning(logged.noHandler)
          return options.clickDeadline.pipe(
            Effect.flatMap((deadline) => ChatInteraction.handle(item, deadline)),
            Effect.provideService(ChatInteraction.Handler, handler.value),
            Effect.flatMap((reply) =>
              reply._tag === "OpenModal"
                // Awaited only for what is left of the click's share, then left running.
                ? Effect.forkDetach(
                  handler.value.refused(item, chatError("openModal", new Unsupported({ capability: "modals" })))
                ).pipe(
                  Effect.flatMap((fiber) =>
                    Effect.flatMap(options.clickDeadline, (left) => Effect.timeoutOption(Fiber.await(fiber), left))
                  ),
                  Effect.asVoid
                )
                : Effect.void
            )
          )
        })
    }
  }, { discard: true })

/** @internal */
export interface Options {
  readonly verify: (headers: { readonly [key: string]: string | undefined }, body: Uint8Array) => Effect.Effect<boolean>
  readonly normalize: (envelope: unknown) => ReadonlyArray<Inbound>
  readonly handle: ReceiveOptions["handle"]
  readonly onUpdate?: ReceiveOptions["onUpdate"]
  readonly deadline: Duration.Duration
  readonly maxBodyBytes: number
}

/** What a click leaves of the deadline for the rest of the request. */
const clickMargin = 250

/**
 * One webhook POST.
 *
 * - 413 past the body limit, 401 for a bad signature, 400 for a body that
 *   is not a JSON object. Another `object` than
 *   `whatsapp_business_account` is answered 200 and dropped.
 * - 503 when an update fails `NotAccepted`, or the whole request takes
 *   longer than the deadline. Meta then delivers the batch again.
 * - A click gets what is left of the deadline, less a margin, so a slow
 *   click handler is detached rather than passing the deadline.
 * - At the deadline the work is interrupted without waiting for its
 *   finalizers, so a slow release can't hold the 503 past Meta's cutoff.
 *
 * @internal
 */
export const handleRequest = (
  request: HttpServerRequest.HttpServerRequest,
  options: Options
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.gen(function*() {
    const fiber = yield* Effect.forkDetach(work(request, options))
    const response = yield* Effect.onInterrupt(
      Effect.timeoutOption(Fiber.join(fiber), options.deadline),
      () => Fiber.interrupt(fiber)
    )
    if (Option.isSome(response)) return response.value
    yield* Effect.forkDetach(Fiber.interrupt(fiber))
    yield* Effect.logWarning(logged.deadline)
    return status(503)
  })

const work = (
  request: HttpServerRequest.HttpServerRequest,
  options: Options
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.gen(function*() {
    const until = (yield* Clock.currentTimeMillis) + Duration.toMillis(options.deadline)
    const body = yield* readBody(request, options.maxBodyBytes)
    if (Option.isNone(body)) return status(413)
    if (!(yield* options.verify(request.headers, body.value))) return status(401)
    let envelope: unknown
    try {
      envelope = JSON.parse(new TextDecoder().decode(body.value))
    } catch {
      return status(400)
    }
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) return status(400)
    if ((envelope as { readonly object?: unknown }).object !== "whatsapp_business_account") return ok
    if (groupMessages(envelope) > 0) yield* Effect.logDebug(logged.group)
    return yield* receive(options.normalize(envelope), {
      handle: options.handle,
      onUpdate: options.onUpdate,
      clickDeadline: Effect.map(
        Clock.currentTimeMillis,
        (now) => Duration.millis(Math.max(0, until - now - clickMargin))
      )
    }).pipe(
      Effect.as(ok),
      Effect.catchTag("NotAccepted", () => Effect.as(Effect.logWarning(logged.notAccepted), status(503)))
    )
  })
