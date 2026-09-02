import { transformSync } from "@babel/core"
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
import { stripTypeScriptTypes } from "node:module"

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

function loadClient(source: string, httpClient: HttpClient.HttpClient) {
  // Execute the complete generated module with the same Effect modules as the test.
  const compiled = transformSync(stripTypeScriptTypes(source), {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"]
  })
  assert.isString(compiled?.code)
  const exports = {} as {
    SubmitRequestFormData?: Schema.Codec<{ readonly name: string }>
    make: (httpClient: HttpClient.HttpClient) => {
      submit: (options: { payload: { name: string } }) => Effect.Effect<unknown, unknown>
      submitSse: (options: { payload: { name: string } }) => Stream.Stream<unknown, unknown>
      submitStream: (options: { payload: { name: string } }) => Stream.Stream<unknown, unknown>
    }
  }
  new Function("require", "exports", compiled!.code!)(
    (id: keyof typeof modules) => {
      assert.property(modules, id)
      return modules[id]
    },
    exports
  )
  return { client: exports.make(httpClient), payloadSchema: exports.SubmitRequestFormData }
}

describe("generated multipart request encoding", () => {
  for (const format of ["httpclient", "httpclient-type-only"] as const) {
    for (const method of ["submit", "submitSse", "submitStream"] as const) {
      it.effect(`${format} ${method} sends record fields as multipart`, () =>
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
                      "multipart/form-data": {
                        schema: {
                          type: "object",
                          properties: { name: { type: "string" }, nickname: { type: "string" } },
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
          const { client, payloadSchema } = loadClient(source, httpClient)
          const options = { payload: { name: "Ada Lovelace" } }
          if (format === "httpclient") {
            assert.isDefined(payloadSchema)
            assert.deepStrictEqual(yield* Schema.decodeUnknownEffect(payloadSchema!)(options.payload), options.payload)
          }
          if (method === "submit") {
            yield* client.submit(options)
          } else {
            yield* Stream.runDrain(client[method](options))
          }
          assert.strictEqual(requests.length, 1)
          const request = yield* HttpClientRequest.toWeb(requests[0])
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.url, "https://example.test/submit")
          const bytes = yield* Effect.promise(() => request.clone().text())
          assert.match(request.headers.get("content-type") ?? "", /^multipart\/form-data; boundary=/, bytes)
          const body = requests[0].body
          assert.strictEqual(body._tag, "FormData")
          if (body._tag === "FormData") {
            assert.instanceOf(body.formData, FormData)
            assert.deepStrictEqual(Array.from(body.formData.entries()), [["name", "Ada Lovelace"]])
            assert.isFalse(body.formData.has("nickname"))
          }
          const fields = yield* Effect.promise(() => request.formData())
          assert.deepStrictEqual(Array.from(fields.entries()), [["name", "Ada Lovelace"]])
          assert.isFalse(fields.has("nickname"))
        }).pipe(Effect.provide(
          format === "httpclient" ? OpenApiGenerator.layerTransformerSchema : OpenApiGenerator.layerTransformerTs
        )))
    }
  }
})
