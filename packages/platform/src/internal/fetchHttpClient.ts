import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as Stream from "effect/Stream"
import * as Headers from "../Headers.js"
import type * as Client from "../HttpClient.js"
import * as Error from "../HttpClientError.js"
import * as client from "./httpClient.js"
import * as internalResponse from "./httpClientResponse.js"

/** @internal */
export const fetchTagKey = "@effect/platform/FetchHttpClient/Fetch"
/** @internal */
export const requestInitTagKey = "@effect/platform/FetchHttpClient/FetchOptions"

const fetch: Client.HttpClient = client.make((request, url, signal, fiber) => {
  const context = fiber.getFiberRef(FiberRef.currentContext)
  const fetch: typeof globalThis.fetch = context.unsafeMap.get(fetchTagKey) ?? globalThis.fetch
  const options: RequestInit = context.unsafeMap.get(requestInitTagKey) ?? {}
  const headers = options.headers ? Headers.merge(Headers.fromInput(options.headers), request.headers) : request.headers
  const send = (body: BodyInit | undefined) =>
    Effect.map(
      Effect.tryPromise({
        try: () =>
          fetch(url, {
            ...options,
            method: request.method,
            headers,
            body,
            duplex: request.body._tag === "Stream" ? "half" : undefined,
            signal
          } as any),
        catch: (cause) =>
          new Error.RequestError({
            request,
            reason: "Transport",
            cause
          })
      }),
      (response) => internalResponse.fromWeb(request, response)
    )
  switch (request.body._tag) {
    case "Raw":
    case "Uint8Array":
      return send(request.body.body as any)
    case "FormData":
      return send(request.body.formData)
    case "Stream":
      return Effect.flatMap(Stream.toReadableStreamEffect(request.body.stream), send)
  }
  return send(undefined)
})

/** @internal */
export const layer = client.layerMergedContext(Effect.succeed(fetch))
