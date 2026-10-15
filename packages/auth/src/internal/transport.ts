import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"

import { Unavailable } from "../OAuthError.ts"
import * as Validation from "./validation.ts"

/** @internal */
export interface Options {
  readonly timeout: number
  readonly maxResponseBytes: number
}

/**
 * Caller supplies a nonretrying, nonredirecting HttpClient. Each body and socket
 * belongs to this request's Scope; cancellation reaches the entire body read.
 * @internal
 */
export const request = Effect.fnUntraced(
  function*(
    client: HttpClient.HttpClient,
    request: HttpClientRequest.HttpClientRequest,
    options: Options
  ) {
    const response = yield* HttpClient.withScope(client).execute(request)

    if (response.url !== request.url || (response.status >= 300 && response.status < 400)) {
      return yield* Unavailable.make({})
    }
    const announced = response.headers["content-length"]

    if (
      announced !== undefined &&
      (!/^\d+$/u.test(announced) || Number(announced) > options.maxResponseBytes)
    ) {
      return yield* Unavailable.make({})
    }
    const buffer = new Uint8Array(options.maxResponseBytes)

    const length = yield* Stream.runFoldEffect(
      response.stream,
      () => 0,
      (length, chunk) => {
        if (chunk.byteLength > buffer.length - length) return Effect.fail(Unavailable.make({}))
        buffer.set(chunk, length)

        return Effect.succeed(length + chunk.byteLength)
      }
    ).pipe(Effect.catchReason("HttpClientError", "EmptyBodyError", () => Effect.succeed(0)))

    return {
      status: response.status,
      contentType: response.headers["content-type"] ?? null,
      bytes: Redacted.make(buffer.subarray(0, length))
    }
  },
  (effect, _client, _request, options) =>
    effect.pipe(
      Effect.scoped,
      Effect.provideService(FetchHttpClient.RequestInit, {
        // Workers supports manual redirects; the status check above rejects them.
        redirect: "manual",
        credentials: "omit",
        cache: "no-store"
      }),
      Effect.provideService(Tracer.DisablePropagation, true),
      Effect.mapError(() => Unavailable.make({})),
      Effect.timeoutOrElse({ duration: options.timeout, orElse: () => Unavailable.make({}) })
    )
)

/** @internal */
export const isJson = (contentType: string | null) =>
  contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json"

/** @internal */
export const json = Effect.fnUntraced(function*(
  response: Effect.Success<ReturnType<typeof request>>
) {
  if (!isJson(response.contentType)) return yield* Unavailable.make({})
  const bytes = yield* Validation.reveal(response.bytes)

  const text = yield* Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    catch: () => Unavailable.make({})
  })

  const body = yield* Validation.decode(Json, text)

  return {
    status: response.status,
    contentType: response.contentType,
    body: Redacted.make(Validation.freeze(body))
  }
})

const Json = Schema.fromJsonString(Validation.JsonObject)

/**
 * Capture Fetch's optional reference at the installed-client boundary too.
 * @internal
 */
export const capture = Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient
  const fetch = yield* FetchHttpClient.Fetch

  return HttpClient.transformResponse(client, (effect) =>
    effect.pipe(
      Effect.provideService(FetchHttpClient.Fetch, fetch),
      Effect.provideService(Tracer.DisablePropagation, true)
    ))
})
