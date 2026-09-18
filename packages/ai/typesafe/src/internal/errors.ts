import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redactable from "effect/Redactable"
import * as Schema from "effect/Schema"
import * as AiError from "effect/unstable/ai/AiError"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"

const requestDetails = (request: HttpClientRequest.HttpClientRequest) => ({
  method: request.method,
  url: request.url,
  urlParams: Array.from(request.urlParams),
  hash: Option.getOrUndefined(request.hash),
  headers: Redactable.redact(request.headers) as Record<string, string>
})

const ErrorBody = Schema.Struct({
  message: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String)
})

const retryAfter = (headers: Readonly<Record<string, string>>) => {
  const ms = headers["retry-after-ms"]
  if (ms !== undefined && ms.trim() !== "" && Number.isFinite(Number(ms)) && Number(ms) >= 0) {
    return Duration.millis(Number(ms))
  }
  const raw = headers["retry-after"]
  if (raw === undefined || raw.trim() === "") return undefined
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return Duration.seconds(seconds)
  const date = Date.parse(raw)
  return Number.isFinite(date) ? Duration.millis(Math.max(0, date - Date.now())) : undefined
}

export const mapHttpClientError = Effect.fnUntraced(
  function*(error: HttpClientError.HttpClientError, method: string): Effect.fn.Return<never, AiError.AiError> {
    const source = error.reason
    let reason: AiError.AiErrorReason
    switch (source._tag) {
      case "TransportError":
      case "EncodeError":
      case "InvalidUrlError":
        reason = new AiError.NetworkError({
          reason: source._tag,
          description: source.description,
          request: requestDetails(source.request)
        })
        break
      case "DecodeError":
      case "EmptyBodyError":
        reason = new AiError.InvalidOutputError({
          description: source.description ?? "Failed to decode TypeSafe response"
        })
        break
      case "StatusCodeError": {
        const { request, response } = source
        const body = yield* response.text.pipe(Effect.catch(() => Effect.succeed(source.description)))
        const parsed = yield* response.json.pipe(Effect.catch(() => Effect.succeed(undefined)))
        const decoded = Schema.decodeUnknownOption(ErrorBody)(parsed)
        const details = Option.getOrUndefined(decoded)
        const http = {
          request: requestDetails(request),
          response: { status: response.status, headers: Redactable.redact(response.headers) as Record<string, string> },
          body
        }
        const description = AiError.buildErrorDescription({
          status: response.status,
          method: request.method,
          url: request.url,
          body,
          message: details?.message,
          errorCode: details?.code,
          errorType: details?.type,
          requestId: response.headers["x-typesafe-request-id"]
        })
        if (response.status === 429) {
          reason = new AiError.RateLimitError({
            retryAfter: retryAfter(response.headers),
            http,
            metadata: {
              typesafe: {
                requestId: response.headers["x-typesafe-request-id"] ?? null,
                errorCode: details?.code ?? null,
                errorType: details?.type ?? null
              }
            }
          })
        } else if (response.status === 404 || response.status === 422) {
          reason = new AiError.InvalidRequestError({ description, http })
        } else {
          reason = AiError.reasonFromHttpStatus({ status: response.status, description, http })
        }
        break
      }
    }
    return yield* AiError.make({ module: "TypeSafeClient", method, reason })
  }
)
