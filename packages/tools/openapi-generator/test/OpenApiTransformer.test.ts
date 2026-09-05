import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import { assert, describe, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Sse from "effect/unstable/encoding/Sse"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import type { OpenAPISpec } from "effect/unstable/httpapi/OpenApi"
import { rolldown } from "rolldown"

const modules = {
  "effect/Data": Data,
  "effect/Effect": Effect,
  "effect/Schema": Schema,
  "effect/Stream": Stream,
  "effect/unstable/encoding/Sse": Sse,
  "effect/unstable/http/HttpClient": HttpClient,
  "effect/unstable/http/HttpClientError": HttpClientError,
  "effect/unstable/http/HttpClientRequest": HttpClientRequest,
  "effect/unstable/http/HttpClientResponse": HttpClientResponse
}

type TransformClient = (client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>

async function loadClient(source: string) {
  const bundle = await rolldown({
    input: "client.ts",
    external: (id) => id !== "client.ts",
    plugins: [{
      name: "generated-client",
      resolveId: (id) => id === "client.ts" ? id : undefined,
      load: (id) => id === "client.ts" ? source : undefined
    }]
  })
  try {
    const { output } = await bundle.generate({ format: "cjs" })
    const compiled = output[0]
    assert.strictEqual(compiled.type, "chunk")
    const exports = {} as {
      make: (httpClient: HttpClient.HttpClient, options?: { transformClient: TransformClient }) => {
        readStream: () => Stream.Stream<unknown, HttpClientError.HttpClientError>
        readSse: () => Stream.Stream<unknown, HttpClientError.HttpClientError>
      }
    }
    new Function("require", "exports", compiled.code)(
      (id: keyof typeof modules) => {
        assert.property(modules, id)
        return modules[id]
      },
      exports
    )
    return exports.make
  } finally {
    await bundle.close()
  }
}

const paths = [
  { format: "httpclient", encoding: "binary" },
  { format: "httpclient", encoding: "sse-data" },
  { format: "httpclient", encoding: "sse-event" },
  { format: "httpclient-type-only", encoding: "binary" },
  { format: "httpclient-type-only", encoding: "sse-data" }
] as const

describe("OpenApiTransformer", () => {
  for (const { encoding, format } of paths) {
    const binary = encoding === "binary"
    const body = binary
      ? "download"
      : encoding === "sse-event"
      ? "event: message\nid: 1\ndata: hello\n\n"
      : "event: message\nid: 1\ndata: \"hello\"\n\n"
    const expected = binary
      ? [new TextEncoder().encode(body)]
      : format === "httpclient-type-only"
      ? ["hello"]
      : [{ event: "message", id: "1", data: "hello" }]
    const spec: OpenAPISpec = {
      openapi: "3.1.0",
      info: { title: "Streaming API", version: "1.0.0" },
      components: { schemas: {}, securitySchemes: {} },
      security: [],
      tags: [],
      paths: {
        "/read": {
          get: {
            operationId: "read",
            parameters: [],
            tags: ["Streams"],
            security: [],
            responses: {
              "200": {
                description: "Success",
                content: {
                  [binary ? "application/octet-stream" : "text/event-stream"]: {
                    schema: encoding === "sse-event"
                      ? {
                        type: "object",
                        properties: {
                          id: { anyOf: [{ type: "string" }, { type: "null" }] },
                          event: { const: "message" },
                          data: { type: "string" }
                        },
                        required: ["id", "event", "data"],
                        additionalProperties: false
                      }
                      : { type: "string" },
                    ...(encoding === "sse-event"
                      ? {
                        "x-effect-stream": {
                          encoding: "sse",
                          errorSchema: {},
                          causeSchema: {},
                          failureEvent: "effect/httpapi/stream/failure"
                        }
                      }
                      : {})
                  }
                }
              }
            }
          }
        }
      }
    }
    const generate = Effect.gen(function*() {
      const generator = yield* OpenApiGenerator.OpenApiGenerator
      const source = yield* generator.generate(spec, { name: "TestClient", format })
      return yield* Effect.promise(() => loadClient(source))
    }).pipe(Effect.provide(
      format === "httpclient" ? OpenApiGenerator.layerTransformerSchema : OpenApiGenerator.layerTransformerTs
    ))

    describe(`${format} ${encoding}`, () => {
      it.effect("defers transformation and applies fresh headers on each consumption", () =>
        Effect.gen(function*() {
          const make = yield* generate
          const requests: Array<HttpClientRequest.HttpClientRequest> = []
          let transforms = 0
          let transformEffects = 0
          const httpClient = HttpClient.make((request) => {
            requests.push(request)
            return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body)))
          }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.com")))
          const client = make(httpClient, {
            transformClient: (client) => {
              transforms++
              return Effect.sync(() => {
                transformEffects++
                return HttpClient.mapRequest(client, HttpClientRequest.setHeader("x-transformed", String(transforms)))
              })
            }
          })
          const stream = binary ? client.readStream() : client.readSse()
          assert.strictEqual(transforms, 0)
          assert.strictEqual(transformEffects, 0)
          assert.deepStrictEqual(requests, [])
          for (let run = 1; run <= 2; run++) {
            assert.deepStrictEqual(yield* Stream.runCollect(stream), expected)
            assert.strictEqual(requests.length, run)
            assert.strictEqual(requests[run - 1].headers["x-transformed"], String(run))
            assert.strictEqual(transforms, run)
            assert.strictEqual(transformEffects, run)
          }
        }))

      it.effect("filters the response returned by the transformed client", () =>
        Effect.gen(function*() {
          const make = yield* generate
          const httpClient = HttpClient.make((request) =>
            Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body)))
          ).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.com")))
          const client = make(httpClient, {
            transformClient: (client) =>
              Effect.succeed(HttpClient.transformResponse(
                client,
                Effect.map((response) =>
                  HttpClientResponse.fromWeb(response.request, new Response(body, { status: 403 }))
                )
              ))
          })
          const stream = binary ? client.readStream() : client.readSse()
          const error = yield* Effect.flip(Stream.runCollect(stream))
          assert.strictEqual(error._tag, "HttpClientError")
          assert.strictEqual(error.reason._tag, "StatusCodeError")
          if (error.reason._tag === "StatusCodeError") {
            assert.strictEqual(error.reason.response.status, 403)
          }
        }))

      for (const status of [200, 403]) {
        it.effect(`preserves status ${status} handling without a transform`, () =>
          Effect.gen(function*() {
            const make = yield* generate
            let requests = 0
            const httpClient = HttpClient.make((request) => {
              requests++
              return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body, { status })))
            }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.com")))
            const client = make(httpClient)
            const stream = binary ? client.readStream() : client.readSse()
            assert.strictEqual(requests, 0)
            if (status === 200) {
              assert.deepStrictEqual(yield* Stream.runCollect(stream), expected)
            } else {
              const error = yield* Effect.flip(Stream.runCollect(stream))
              assert.strictEqual(error.reason._tag, "StatusCodeError")
            }
            assert.strictEqual(requests, 1)
          }))
      }
    })
  }
})
