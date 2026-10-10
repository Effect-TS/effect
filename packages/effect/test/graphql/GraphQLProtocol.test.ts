import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Layer } from "effect"
import { GraphQLClient, GraphQLProtocol } from "effect/graphql"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import { expectReason, graphqlResponse, layerHttp, Viewer, ViewerGroup } from "./fixtures.ts"

const viewerData = { data: { viewer: { login: "tim" } } }

const callViewer = (handler: Parameters<typeof layerHttp>[0]) =>
  GraphQLClient.make(ViewerGroup).pipe(
    Effect.flatMap((client) => client.Viewer()),
    Effect.provide(layerHttp(handler))
  )

describe("GraphQLProtocol.layerHttp", () => {
  describe("request", () => {
    it.effect("POSTs the document, operation name and variables as JSON and applies per-call headers", () =>
      Effect.gen(function*() {
        let seen: { method: string; headers: Record<string, string>; body: unknown } | undefined
        const result = yield* GraphQLClient.make(ViewerGroup).pipe(
          Effect.flatMap((client) => client.Viewer(undefined, { headers: { "x-request-id": "abc" } })),
          Effect.provide(layerHttp((request, bodyText) => {
            seen = { method: request.method, headers: request.headers, body: JSON.parse(bodyText!) }
            return graphqlResponse(viewerData)
          }))
        )
        assert.deepStrictEqual(result, { viewer: { login: "tim" } })
        assert.strictEqual(seen!.method, "POST")
        assert.strictEqual(seen!.headers["x-request-id"], "abc")
        assert.include(seen!.headers["accept"], "application/graphql-response+json")
        assert.deepStrictEqual(seen!.body, {
          query: Viewer.document,
          operationName: "Viewer",
          variables: {}
        })
      }))
  })

  describe("response detection", () => {
    it.effect("accepts application/graphql-response+json", () =>
      Effect.gen(function*() {
        const result = yield* callViewer(() => graphqlResponse(viewerData))
        assert.deepStrictEqual(result, { viewer: { login: "tim" } })
      }))

    it.effect("falls back to the data/errors key check for application/json", () =>
      Effect.gen(function*() {
        const result = yield* callViewer(() => graphqlResponse(viewerData, { contentType: "application/json" }))
        assert.deepStrictEqual(result, { viewer: { login: "tim" } })
      }))

    it.effect("a 200 application/json body without data or errors is a DecodeError", () =>
      Effect.gen(function*() {
        const reason = yield* callViewer(() => graphqlResponse({ ok: true }, { contentType: "application/json" }))
          .pipe(expectReason("DecodeError"))
        assert.isFalse(reason.isRetryable)
      }))

    it.effect("a 4xx with a GraphQL body is a ResponseError", () =>
      Effect.gen(function*() {
        const reason = yield* callViewer(() =>
          graphqlResponse({ errors: [{ message: "Bad credentials" }] }, { status: 401 })
        ).pipe(expectReason("ResponseError"))
        assert.deepStrictEqual(reason.errors, [{ message: "Bad credentials" }])
        assert.isFalse(reason.isRetryable)
      }))

    it.effect("a 200 text/plain body is a TransportError", () =>
      Effect.gen(function*() {
        const reason = yield* callViewer(() =>
          new Response("<html>login</html>", { status: 200, headers: { "content-type": "text/html" } })
        ).pipe(expectReason("TransportError"))
        assert.strictEqual(reason.status, 200)
      }))
  })

  describe("non-GraphQL HTTP failures", () => {
    it.effect("a 503 with a numeric Retry-After is a retryable TransportError carrying retryAfter", () =>
      Effect.gen(function*() {
        const reason = yield* callViewer(() =>
          new Response("down", { status: 503, headers: { "retry-after": "30", "content-type": "text/plain" } })
        ).pipe(expectReason("TransportError"))
        assert.strictEqual(reason.status, 503)
        assert.isTrue(reason.isRetryable)
        assert.deepStrictEqual(reason.retryAfter, Duration.seconds(30))
        assert.isTrue(HttpClientError.isHttpClientError(reason.cause))
      }))

    it.effect("a 503 with an HTTP-date Retry-After measures retryAfter from the Effect clock", () =>
      Effect.gen(function*() {
        // it.effect runs under TestClock, whose current time is the Unix epoch.
        const date = new Date(45_000).toUTCString()
        const reason = yield* callViewer(() =>
          new Response("down", { status: 503, headers: { "retry-after": date, "content-type": "text/plain" } })
        ).pipe(expectReason("TransportError"))
        assert.deepStrictEqual(reason.retryAfter, Duration.seconds(45))
      }))

    it.effect("a 404 without a GraphQL body is a non-retryable TransportError", () =>
      Effect.gen(function*() {
        const reason = yield* callViewer(() =>
          new Response("not here", { status: 404, headers: { "content-type": "text/plain" } })
        ).pipe(expectReason("TransportError"))
        assert.strictEqual(reason.status, 404)
        assert.isFalse(reason.isRetryable)
        assert.isUndefined(reason.retryAfter)
      }))

    it.effect("a network failure is a retryable TransportError without status", () =>
      Effect.gen(function*() {
        const failing = Layer.succeed(
          HttpClient.HttpClient,
          HttpClient.make((request) =>
            Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({ request, description: "ECONNREFUSED" })
              })
            )
          )
        )
        const reason = yield* GraphQLClient.make(ViewerGroup).pipe(
          Effect.flatMap((client) => client.Viewer()),
          Effect.provide(GraphQLProtocol.layerHttp({ url: "http://localhost/graphql" }).pipe(Layer.provide(failing))),
          expectReason("TransportError")
        )
        assert.isUndefined(reason.status)
        assert.isTrue(reason.isRetryable)
        assert.include(reason.description, "ECONNREFUSED")
      }))
  })
})
