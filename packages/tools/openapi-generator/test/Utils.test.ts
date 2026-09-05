import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import * as Utils from "@effect/openapi-generator/Utils"
import { assert, describe, expect, it } from "@effect/vitest"
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
  const { output } = await bundle.generate({ format: "cjs" })
  await bundle.close()
  const compiled = output[0]
  assert.strictEqual(compiled.type, "chunk")
  const exports = {} as {
    make: (
      httpClient: HttpClient.HttpClient,
      options?: {
        transformClient: (client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>
      }
    ) => {
      readStream: () => Stream.Stream<unknown, HttpClientError.HttpClientError>
      readSse: () => Stream.Stream<unknown, HttpClientError.HttpClientError>
      submit: (options: { payload: { name: string } }) => Effect.Effect<unknown, unknown>
      submitSse: (options: { payload: { name: string } }) => Stream.Stream<unknown, unknown>
      submitStream: (options: { payload: { name: string } }) => Stream.Stream<unknown, unknown>
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
}

describe("Utils", () => {
  describe("camelize", () => {
    it("removes hyphens and capitalizes following letters", () => {
      expect(Utils.camelize("my-operation-id")).toBe("myOperationId")
    })

    it("removes slashes and capitalizes following letters", () => {
      expect(Utils.camelize("my/operation/id")).toBe("myOperationId")
    })

    it("handles numbers", () => {
      expect(Utils.camelize("operation-2")).toBe("operation2")
    })

    it("removes leading numbers", () => {
      expect(Utils.camelize("2operation")).toBe("operation")
    })

    it("handles empty string", () => {
      expect(Utils.camelize("")).toBe("")
    })
  })

  describe("identifier", () => {
    it("capitalizes camelized string", () => {
      expect(Utils.identifier("my-operation")).toBe("MyOperation")
      expect(Utils.identifier("operation-2")).toBe("Operation2")
    })
  })

  describe("generated streaming requests", () => {
    const paths = [
      { format: "httpclient", encoding: "binary" },
      { format: "httpclient", encoding: "sse-data" },
      { format: "httpclient", encoding: "sse-event" },
      { format: "httpclient-type-only", encoding: "binary" },
      { format: "httpclient-type-only", encoding: "sse-data" }
    ] as const

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

  describe("generated request encoding", () => {
    for (const format of ["httpclient", "httpclient-type-only"] as const) {
      for (const method of ["submit", "submitSse", "submitStream"] as const) {
        it.effect(`${format} ${method} sends form-urlencoded payloads`, () =>
          Effect.gen(function*() {
            const responseContentType = method === "submitSse"
              ? "text/event-stream"
              : method === "submitStream"
              ? "application/octet-stream"
              : "application/json"
            const spec: OpenAPISpec = {
              openapi: "3.1.0",
              info: { title: "Form API", version: "1.0.0" },
              components: { schemas: {}, securitySchemes: {} },
              security: [],
              tags: [],
              paths: {
                "/submit": {
                  post: {
                    operationId: "submit",
                    parameters: [],
                    tags: ["Forms"],
                    security: [],
                    requestBody: {
                      required: true,
                      content: {
                        "application/x-www-form-urlencoded": {
                          schema: {
                            type: "object",
                            properties: { name: { type: "string" } },
                            required: ["name"]
                          }
                        }
                      }
                    },
                    responses: {
                      "200": {
                        description: "Success",
                        content: { [responseContentType]: { schema: { type: "string" } } }
                      }
                    }
                  }
                }
              }
            }
            const generator = yield* OpenApiGenerator.OpenApiGenerator
            const source = yield* generator.generate(spec, { name: "TestClient", format })
            const requests: Array<HttpClientRequest.HttpClientRequest> = []
            const httpClient = HttpClient.make((request) => {
              requests.push(request)
              return Effect.succeed(HttpClientResponse.fromWeb(
                request,
                new Response(method === "submitSse" ? "data: \"ok\"\n\n" : "\"ok\"", {
                  headers: { "content-type": responseContentType }
                })
              ))
            }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.test")))
            const make = yield* Effect.promise(() => loadClient(source))
            const client = make(httpClient)
            const options = { payload: { name: "Ada Lovelace" } }
            if (method === "submit") {
              yield* client.submit(options)
            } else {
              yield* Stream.runDrain(client[method](options))
            }
            assert.strictEqual(requests.length, 1)
            const request = yield* HttpClientRequest.toWeb(requests[0])
            assert.deepStrictEqual({
              contentType: request.headers.get("content-type"),
              body: yield* Effect.promise(() => request.text())
            }, {
              contentType: "application/x-www-form-urlencoded",
              body: "name=Ada+Lovelace"
            })
          }).pipe(Effect.provide(
            format === "httpclient" ? OpenApiGenerator.layerTransformerSchema : OpenApiGenerator.layerTransformerTs
          )))
      }
    }
  })

  it.effect("encodes multipart record payloads as form data", () =>
    Effect.gen(function*() {
      const spec: OpenAPISpec = {
        openapi: "3.1.0",
        info: { title: "Form API", version: "1.0.0" },
        components: { schemas: {}, securitySchemes: {} },
        security: [],
        tags: [],
        paths: {
          "/submit": {
            post: {
              operationId: "submit",
              parameters: [],
              tags: ["Forms"],
              security: [],
              requestBody: {
                required: true,
                content: {
                  "multipart/form-data": {
                    schema: {
                      type: "object",
                      properties: { name: { type: "string" } },
                      required: ["name"]
                    }
                  }
                }
              },
              responses: {
                "200": {
                  description: "Success",
                  content: { "application/json": { schema: { type: "string" } } }
                }
              }
            }
          }
        }
      }
      const generator = yield* OpenApiGenerator.OpenApiGenerator
      const source = yield* generator.generate(spec, { name: "TestClient", format: "httpclient" })
      const requests: Array<HttpClientRequest.HttpClientRequest> = []
      const httpClient = HttpClient.make((request) => {
        requests.push(request)
        return Effect.succeed(HttpClientResponse.fromWeb(
          request,
          new Response("\"ok\"", { headers: { "content-type": "application/json" } })
        ))
      }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.test")))
      const make = yield* Effect.promise(() => loadClient(source))
      const client = make(httpClient)

      yield* client.submit({ payload: { name: "Ada Lovelace" } })

      assert.strictEqual(requests.length, 1)
      const request = yield* HttpClientRequest.toWeb(requests[0])
      const body = yield* Effect.promise(() => request.clone().text())
      assert.notStrictEqual(body, "[object Object]")
      const formData = yield* Effect.promise(() => request.formData())
      assert.deepStrictEqual(Array.from(formData.entries()), [["name", "Ada Lovelace"]])
    }).pipe(Effect.provide(OpenApiGenerator.layerTransformerSchema)))
})
