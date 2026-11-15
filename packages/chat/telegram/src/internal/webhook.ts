import { timingSafeEqual } from "effect/crypto/Mac"
import * as Effect from "effect/Effect"
import type * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import type { Outcome } from "./receive.ts"

/** The header Telegram sends the webhook secret in. @internal */
export const secretHeader = "x-telegram-bot-api-secret-token"

/** Telegram's rule for a secret, with the adapter's floor of 32 characters. @internal */
export const validSecret = (secret: string): boolean => /^[A-Za-z0-9_-]{32,256}$/.test(secret)

const encoder = new TextEncoder()

/** Whether a header holds the secret, compared in constant time. @internal */
export const checkSecret = (header: string | undefined, secret: Uint8Array): boolean =>
  header !== undefined && timingSafeEqual(encoder.encode(header), secret)

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

const status = (code: number) => HttpServerResponse.empty({ status: code })

/** What is logged with each 503. @internal */
export const unavailable = {
  invalid: "telegram webhook: the update could not be read, answered 503",
  notAccepted: "telegram webhook: the handler refused the event or passed the deadline, answered 503"
} as const

/**
 * One webhook request.
 *
 * - 401 without the secret, before the body is read. 413 past
 *   `maxBodyBytes`, 400 for a body that is not an update.
 * - 200 once the update was accepted, answered or sent to `onUnhandled`.
 * - 503 when its event was not accepted in time, or could not be read.
 *
 * @internal
 */
export const handleRequest = (
  request: HttpServerRequest.HttpServerRequest,
  options: {
    readonly secret: Uint8Array
    readonly maxBodyBytes: number
    readonly receive: (update: unknown) => Effect.Effect<Outcome>
  }
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.gen(function*() {
    if (!checkSecret(request.headers[secretHeader], options.secret)) return status(401)
    const body = yield* readBody(request, options.maxBodyBytes)
    if (Option.isNone(body)) return status(413)
    let update: unknown
    try {
      update = JSON.parse(new TextDecoder().decode(body.value))
    } catch {
      return status(400)
    }
    if (typeof update !== "object" || update === null || typeof (update as any).update_id !== "number") {
      return status(400)
    }
    const outcome = yield* options.receive(update)
    switch (outcome) {
      case "accepted":
      case "unhandled":
        return status(200)
      case "invalid":
        return yield* Effect.as(Effect.logWarning(unavailable.invalid), status(503))
      case "notAccepted":
        return yield* Effect.as(Effect.logWarning(unavailable.notAccepted), status(503))
    }
  })
