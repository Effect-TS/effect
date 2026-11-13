/**
 * The HTTP clients the driver sends everything through: one retry policy for
 * coordinator requests and for segment downloads.
 *
 * Every protocol request is repeatable: a repeated nextUri GET returns the
 * cached page, DELETE and HEAD are idempotent, and a POST whose response was
 * lost is never dispatched because dispatch waits for the first nextUri GET.
 */
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import type * as Schedule from "effect/Schedule"
import { HttpStatusFailure, type Operation, TransportFailure } from "./failure.ts"

// Proxies and gateways in front of Trino produce these; the coordinator itself
// answers 500 and 408 for failures a repeat would not cure.
const retryableStatuses: ReadonlySet<number> = new Set([429, 502, 503, 504])

// A reset while the body is read surfaces as a decode error.
const isBodyReset = (error: unknown): boolean =>
  HttpClientError.isHttpClientError(error) && error.reason._tag === "DecodeError"

const emptyBody = (response: { readonly request: HttpClientError.TransportError["request"] }) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.TransportError({ request: response.request, description: "empty response body" })
  })

/**
 * Reads every body inside the retry, so a reset mid-body is repeated, and
 * retries transport failures and 429/502/503/504 on `schedule`, never sooner
 * than a `Retry-After`. With `statements`, an empty 200 body is a transport
 * failure too: seen under load behind proxies, and the request is repeatable.
 */
export const retrying = (
  client: HttpClient.HttpClient,
  schedule: Schedule.Schedule<unknown, unknown>,
  statements: boolean
): HttpClient.HttpClient =>
  client.pipe(
    HttpClient.tap((response) =>
      statements
        ? Effect.flatMap(
          response.text,
          (body) => response.status === 200 && body.trim().length === 0 ? Effect.fail(emptyBody(response)) : Effect.void
        )
        : response.arrayBuffer
    ),
    HttpClient.filterStatus((status) => !retryableStatuses.has(status)),
    HttpClient.retryTransient({ retryOn: "errors-only", schedule, while: isBodyReset })
  )

/** What remained of a request after its retries: the status the server answered, or the transport failure. */
export const requestFailure = Effect.fnUntraced(function*(
  error: HttpClientError.HttpClientError,
  operation: Operation
) {
  const { reason } = error
  if (reason._tag === "StatusCodeError") {
    const body = yield* Effect.orElseSucceed(reason.response.text, () => "")
    return new HttpStatusFailure({ status: reason.response.status, body, operation })
  }
  return new TransportFailure({ cause: error, operation })
})
