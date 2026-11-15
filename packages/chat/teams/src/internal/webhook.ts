import type * as ChatEvent from "effect/chat/ChatEvent"
import type { NotAccepted } from "effect/chat/ChatHandler"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { tenantOf, type Verdict } from "./auth.ts"
import type { InvokeResponse } from "./interactions.ts"
import { isSubmitFallback } from "./interactions.ts"
import { type Context, isObject, isTargeted, normalize } from "./normalize.ts"

type JsonObject = { readonly [key: string]: Schema.Json }

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

const status = (code: number) => HttpServerResponse.empty({ status: code })

/**
 * What is logged with each 503 of the route.
 *
 * @internal
 */
export const unavailable = {
  keys: "teams webhook: the signing keys could not be read, answered 503",
  normalize: "teams webhook: the activity could not be normalised, answered 503",
  notAccepted: "teams webhook: the handler refused the event, answered 503",
  deadline: "teams webhook: the request passed its deadline, answered 503"
} as const

/** @internal */
export interface Options {
  readonly verify: (authorization: string | undefined, activity: {
    readonly serviceUrl: unknown
    readonly channelId: unknown
    readonly tenantId: string | undefined
  }) => Effect.Effect<Verdict>
  readonly context: Context
  readonly handle: (event: ChatEvent.ChatEvent) => Effect.Effect<void, NotAccepted>
  readonly onUnhandled: (activity: JsonObject) => Effect.Effect<void>
  readonly invoke: (activity: JsonObject) => Effect.Effect<InvokeResponse>
  readonly command: (activity: JsonObject) => Effect.Effect<void>
  readonly deadline: Duration.Input
  readonly maxBodyBytes: number
}

const respond = (response: InvokeResponse) =>
  response.body === undefined
    ? status(response.status)
    : HttpServerResponse.jsonUnsafe(response.body, { status: response.status })

/**
 * One Bot Framework activity.
 *
 * - 413 past the body limit, 400 for a body that is not a JSON object.
 * - 403 when the token, its `serviceurl`, the channel or the tenant does
 *   not check out, and 503 when the signing keys can't be read.
 * - A targeted activity is classified first, whatever its type: a message
 *   takes the command path, an invoke goes to the interaction handler, and
 *   anything else is answered 200 and dropped. None reaches `ChatHandler`
 *   or `onUnhandled`.
 * - An invoke, or a card's submit fallback, goes to the interaction
 *   handler, whose answer is the response.
 * - Every other activity is normalised and handed to the `ChatHandler`
 *   one event at a time: 200 when all succeed, 503 when one fails
 *   `NotAccepted`, or when a `message` can't be normalised. Any other
 *   activity that gives no event goes to `onUnhandled` and is answered 200.
 * - 503 past `deadline`, the handler interrupted. Each 503 is logged with
 *   its own message.
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
    let activity: unknown
    try {
      activity = JSON.parse(new TextDecoder().decode(body.value))
    } catch {
      return status(400)
    }
    if (!isObject(activity)) return status(400)
    const verdict = yield* options.verify(request.headers.authorization, {
      serviceUrl: activity.serviceUrl,
      channelId: activity.channelId,
      tenantId: tenantOf(activity)
    })
    if (verdict === "forbidden") return status(403)
    if (verdict === "unavailable") return yield* Effect.as(Effect.logWarning(unavailable.keys), status(503))
    if (isTargeted(activity)) {
      if (activity.type === "message") return yield* Effect.as(options.command(activity), status(200))
      if (activity.type === "invoke") return respond(yield* options.invoke(activity))
      return status(200)
    }
    if (activity.type === "invoke") return respond(yield* options.invoke(activity))
    if (isSubmitFallback(activity)) return respond(yield* options.invoke(activity))
    const events = normalize(activity, options.context)
    if (events.length === 0 && activity.type === "message") {
      return yield* Effect.as(Effect.logWarning(unavailable.normalize), status(503))
    }
    if (events.length === 0) return yield* Effect.as(options.onUnhandled(activity), status(200))
    return yield* Effect.forEach(events, options.handle, { discard: true }).pipe(
      Effect.as(status(200)),
      Effect.catchTag("NotAccepted", () => Effect.as(Effect.logWarning(unavailable.notAccepted), status(503)))
    )
  }).pipe(
    Effect.timeoutOption(options.deadline),
    Effect.flatMap(Option.match({
      onNone: () => Effect.as(Effect.logWarning(unavailable.deadline), status(503)),
      onSome: Effect.succeed
    }))
  )
