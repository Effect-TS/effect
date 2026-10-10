import { assert, describe, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Fiber, Layer, Stream } from "effect"
import { GraphQLClient, GraphQLProtocol } from "effect/graphql"
import { TransportError } from "effect/graphql/GraphQLClientError"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { expectReason, graphqlResponse, httpClientLayer, IssuesGroup, IssueUpdated } from "./fixtures.ts"

const url = "http://localhost/graphql"

const event = (title: string) => ({ data: { issueUpdated: { title } } })

const subscription: GraphQLProtocol.GraphQLRequest = {
  query: IssueUpdated.document,
  operationName: "IssueUpdated",
  variables: { id: "I_1" },
  headers: { authorization: "Bearer t" }
}

/**
 * A `text/event-stream` body that sends `chunks`, then ends, fails with
 * `error`, or stays open.
 */
const eventStream = (chunks: ReadonlyArray<string>, end: "close" | "open" | Error) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        if (end === "close") controller.close()
      },
      pull(controller) {
        // Error only after the queued chunks are read; erroring in start discards them.
        if (end instanceof Error) controller.error(end)
      }
    }),
    { headers: { "content-type": "text/event-stream" } }
  )

const next = (payload: unknown) => `event: next\ndata: ${JSON.stringify(payload)}\n\n`

const subscribe = (layer: Layer.Layer<HttpClient.HttpClient>) =>
  GraphQLProtocol.makeHttp({ url }).pipe(
    Effect.map((protocol) => protocol.subscribe(subscription)),
    Effect.provide(layer),
    Stream.unwrap
  )

describe("GraphQLProtocol.layerHttp subscriptions (graphql-sse distinct mode)", () => {
  for (const ending of ["complete", "EOF"] as const) {
    it.effect(`POSTs with Accept: text/event-stream and emits next events until ${ending}`, () =>
      Effect.gen(function*() {
        let seen: { method: string; headers: Record<string, string>; body: unknown } | undefined
        const events = yield* subscribe(httpClientLayer((request, bodyText) => {
          seen = { method: request.method, headers: request.headers, body: JSON.parse(bodyText!) }
          return ending === "complete"
            ? eventStream([next(event("a")), next(event("b")), "event: complete\ndata:\n\n"], "open")
            : eventStream([next(event("a")), next(event("b"))], "close")
        })).pipe(Stream.runCollect)
        assert.deepStrictEqual(events, [event("a"), event("b")])
        assert.strictEqual(seen!.method, "POST")
        assert.include(seen!.headers["accept"], "text/event-stream")
        assert.strictEqual(seen!.headers["authorization"], "Bearer t")
        assert.deepStrictEqual(seen!.body, {
          query: IssueUpdated.document,
          operationName: "IssueUpdated",
          variables: { id: "I_1" }
        })
      }))
  }

  it.effect("a retry: line becomes retryAfter when the stream then fails", () =>
    Effect.gen(function*() {
      const error = yield* subscribe(
        httpClientLayer(() => eventStream([next(event("a")), "retry: 3000\n\n"], new Error("connection reset")))
      ).pipe(Stream.runDrain, Effect.flip)
      assert.instanceOf(error, TransportError)
      assert.isTrue(error.isRetryable)
      assert.deepStrictEqual(error.retryAfter, Duration.seconds(3))
    }))

  it.effect("a GraphQL error response instead of a stream fails the client stream with ResponseError", () =>
    Effect.gen(function*() {
      const layer = GraphQLProtocol.layerHttp({ url }).pipe(
        Layer.provide(httpClientLayer(() => graphqlResponse({ errors: [{ message: "denied" }] }, { status: 400 })))
      )
      const reason = yield* GraphQLClient.make(IssuesGroup).pipe(
        Effect.map((client) => client.IssueUpdated({ id: "I_1" })),
        Effect.provide(layer),
        Stream.unwrap,
        Stream.runDrain,
        expectReason("ResponseError")
      )
      assert.deepStrictEqual(reason.errors, [{ message: "denied" }])
    }))

  it.effect("interrupting the stream aborts the request", () =>
    Effect.gen(function*() {
      let signal: AbortSignal | undefined
      const layer = Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request, _url, abort) => {
          signal = abort
          return Effect.succeed(HttpClientResponse.fromWeb(request, eventStream([next(event("a"))], "open")))
        })
      )
      const received = yield* Deferred.make<void>()
      const fiber = yield* subscribe(layer).pipe(
        Stream.runForEach(() => Deferred.succeed(received, void 0)),
        Effect.forkChild
      )
      // Join too, so a stream that fails before its first event fails the test.
      yield* Deferred.await(received).pipe(Effect.raceFirst(Fiber.join(fiber)))
      assert.isFalse(signal!.aborted)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(signal!.aborted)
    }))
})
