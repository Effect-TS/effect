import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Exit, Layer, Schema, Stream } from "effect"
import { Sse } from "effect/unstable/encoding"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"
import { AtomHttpApi, AtomRegistry } from "effect/unstable/reactivity"

const api = HttpApi.make("StreamApi").add(
  HttpApiGroup.make("events").add(
    HttpApiEndpoint.get("watch", "/watch", { success: HttpApiSchema.StreamSse({ data: Schema.String }) })
  )
)

describe("AtomHttpApi real generated SSE client", () => {
  for (const operation of ["query", "mutation"] as const) {
    for (const [directive, body] of [["retry", "retry: 1000\n\n"], ["data", "data: \"hello\"\n\n"]] as const) {
      it.effect(`${operation} returns a stream preserving valid ${directive}`, () =>
        Effect.gen(function*() {
          const requests: Array<string> = []
          const Client = AtomHttpApi.Service()("StreamClient", {
            api,
            baseUrl: "https://example.test",
            httpClient: Layer.succeed(
              HttpClient.HttpClient,
              HttpClient.make((request) => {
                requests.push(request.url)
                return Effect.succeed(HttpClientResponse.fromWeb(
                  request,
                  new Response(body, {
                    headers: { "content-type": "text/event-stream" }
                  })
                ))
              })
            )
          })
          const registry = yield* Effect.acquireRelease(
            Effect.sync(() => AtomRegistry.make()),
            (registry) => Effect.sync(() => registry.dispose())
          )
          const atom = operation === "query" ? Client.query("events", "watch", {}) : Client.mutation("events", "watch")
          yield* AtomRegistry.mount(registry, atom)
          if (operation === "mutation") {
            registry.set(Client.mutation("events", "watch"), {})
          }
          const stream = yield* AtomRegistry.getResult(registry, atom)
          assert(Stream.isStream(stream))
          const result = yield* Effect.exit(Stream.runCollect(stream))
          if (directive === "retry") {
            assert(Exit.isFailure(result))
            assert.deepStrictEqual(
              result.cause.reasons.map((reason) => reason._tag === "Fail" ? reason.error : reason),
              [new Sse.Retry({ duration: Duration.millis(1000), lastEventId: undefined })]
            )
          } else {
            assert(Exit.isSuccess(result))
            assert.deepStrictEqual(result.value, ["hello"])
          }
          assert.deepStrictEqual(requests, ["https://example.test/watch"])
        }))
    }
  }
})
