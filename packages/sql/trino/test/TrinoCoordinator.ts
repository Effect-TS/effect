import { TrinoClient } from "@effect/sql-trino"
import { Context, Effect, Layer } from "effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

/**
 * A scripted Trino coordinator for unit tests. It answers the client's
 * `POST /v1/statement` and `nextUri` requests with a fixed list of replies,
 * in order, and records every request it receives.
 *
 * `DELETE` requests (query cancellation) are answered with `204` without
 * consuming a reply. Any other request beyond the script fails the test.
 */

export const baseUrl = "http://trino.test"

export const nextUri = (token: number): string => `${baseUrl}/v1/statement/executing/q1/y${token}/${token}`

export interface Request {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string | undefined>>
  readonly body: string
  /** Aborted once the client releases the request and its response. */
  readonly signal: AbortSignal
}

export type Reply =
  | {
    readonly _tag: "Response"
    readonly status: number
    readonly headers: Readonly<Record<string, string>>
    readonly body: string | null
  }
  | { readonly _tag: "TransportError" }
  | { readonly _tag: "Pending" }

/** A reply with the given status and no body, e.g. a load balancer 502. */
export const status = (status: number, headers: Record<string, string> = {}): Reply => ({
  _tag: "Response",
  status,
  headers,
  body: null
})

/** The connection fails before any response arrives. */
export const transportError: Reply = { _tag: "TransportError" }

/** The request never completes, like a long poll for a slow query. */
export const pending: Reply = { _tag: "Pending" }

export interface Column {
  readonly name: string
  readonly type: string
  readonly typeSignature: unknown
}

export const column = (
  name: string,
  type: string,
  typeSignature: unknown = { rawType: type, arguments: [] }
): Column => ({ name, type, typeSignature })

export interface QueryError {
  readonly message: string
  readonly errorCode: number
  readonly errorName: string
  readonly errorType: string
}

export const queryError = (errorName: string, errorCode: number, errorType = "USER_ERROR"): QueryError => ({
  message: `${errorName} raised by the test coordinator`,
  errorCode,
  errorName,
  errorType
})

/**
 * A `QueryResults` document. `data` is raw JSON text so a test can send
 * integers that a JavaScript number cannot represent, exactly as Trino does.
 */
export const page = (options: {
  readonly next?: number | undefined
  readonly columns?: ReadonlyArray<Column> | undefined
  readonly data?: string | undefined
  readonly error?: QueryError | undefined
  readonly updateType?: string | undefined
  readonly headers?: Record<string, string> | undefined
}): Reply => {
  const fields = [`"id":"q1"`, `"infoUri":"${baseUrl}/ui/query.html?q1"`]
  if (options.next !== undefined) fields.push(`"nextUri":${JSON.stringify(nextUri(options.next))}`)
  if (options.columns !== undefined) fields.push(`"columns":${JSON.stringify(options.columns)}`)
  if (options.data !== undefined) fields.push(`"data":${options.data}`)
  if (options.error !== undefined) fields.push(`"error":${JSON.stringify(options.error)}`)
  if (options.updateType !== undefined) fields.push(`"updateType":${JSON.stringify(options.updateType)}`)
  const state = options.error !== undefined ? "FAILED" : options.next !== undefined ? "RUNNING" : "FINISHED"
  fields.push(`"stats":{"state":"${state}"}`, `"warnings":[]`)
  return {
    _tag: "Response",
    status: 200,
    headers: { "content-type": "application/json", ...options.headers },
    body: `{${fields.join(",")}}`
  }
}

export class Coordinator extends Context.Service<Coordinator, {
  readonly requests: Effect.Effect<ReadonlyArray<Request>>
  readonly awaitRequests: (count: number) => Effect.Effect<void>
}>()("test/TrinoCoordinator") {}

/** All requests the coordinator has received so far, in arrival order. */
export const requests = Coordinator.use((coordinator) => coordinator.requests)

/** Waits until the coordinator has received at least `count` requests. */
export const awaitRequests = (count: number) => Coordinator.use((coordinator) => coordinator.awaitRequests(count))

const bodyText = (request: HttpClientRequest.HttpClientRequest): string => {
  switch (request.body._tag) {
    case "Uint8Array":
      return new TextDecoder().decode(request.body.body)
    case "Raw":
      return typeof request.body.body === "string" ? request.body.body : String(request.body.body)
    default:
      return ""
  }
}

const respond = (request: HttpClientRequest.HttpClientRequest, reply: Reply & { readonly _tag: "Response" }) =>
  HttpClientResponse.fromWeb(request, new Response(reply.body, { status: reply.status, headers: reply.headers }))

const makeCoordinator = (replies: ReadonlyArray<Reply>) =>
  Effect.sync(() => {
    const received: Array<Request> = []
    let replyIndex = 0

    const httpClient = HttpClient.make((request, url, signal) =>
      Effect.suspend(() => {
        received.push({
          method: request.method,
          url: url.toString(),
          headers: { ...request.headers },
          body: bodyText(request),
          signal
        })
        if (request.method === "DELETE") {
          return Effect.succeed(respond(request, { _tag: "Response", status: 204, headers: {}, body: null }))
        }
        const reply = replies[replyIndex++]
        if (reply === undefined) {
          return Effect.die(new Error(`Unexpected request: ${request.method} ${url.toString()}`))
        }
        switch (reply._tag) {
          case "Response":
            return Effect.succeed(respond(request, reply))
          case "TransportError":
            return Effect.fail(
              new HttpClientError.HttpClientError({ reason: new HttpClientError.TransportError({ request }) })
            )
          case "Pending":
            return Effect.never
        }
      })
    )

    const coordinator = Coordinator.of({
      requests: Effect.sync(() => received.slice()),
      awaitRequests: (count) =>
        Effect.suspend(() => received.length >= count ? Effect.void : Effect.yieldNow).pipe(
          Effect.repeat({ until: () => received.length >= count })
        )
    })

    return Context.make(HttpClient.HttpClient, httpClient).pipe(Context.add(Coordinator, coordinator))
  })

/**
 * Provides a `TrinoClient` (and `SqlClient`) talking to a scripted coordinator,
 * plus the `Coordinator` service to inspect the requests it received.
 */
export const layer = (
  replies: ReadonlyArray<Reply>,
  config: Partial<TrinoClient.TrinoClientConfig> = {}
) =>
  TrinoClient.layer({ url: baseUrl, user: "effect", ...config }).pipe(
    Layer.provideMerge(Layer.effectContext(makeCoordinator(replies)))
  )
