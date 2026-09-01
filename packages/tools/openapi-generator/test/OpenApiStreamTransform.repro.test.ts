import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import type { OpenAPISpec } from "effect/unstable/httpapi/OpenApi"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const spec: OpenAPISpec = {
  openapi: "3.1.0",
  info: { title: "Stream transform repro", version: "1.0.0" },
  paths: {
    "/download": {
      get: {
        operationId: "download",
        parameters: [],
        responses: {
          "200": {
            description: "bytes",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" }
              }
            }
          }
        },
        tags: ["Repro"],
        security: []
      }
    }
  },
  components: { schemas: {}, securitySchemes: {} },
  security: [],
  tags: [{ name: "Repro" }]
}

describe("OpenAPI streamed transformClient reproduction", () => {
  it.effect("applies transformClient lazily when a generated binary stream runs", () =>
    Effect.gen(function*() {
      const generator = yield* OpenApiGenerator.OpenApiGenerator
      const source = yield* generator.generate(spec, {
        name: "ReproClient",
        format: "httpclient"
      })
      const directory = mkdtempSync(
        join(dirname(fileURLToPath(import.meta.url)), ".stream-transform-repro-")
      )
      const path = join(directory, "ReproClient.ts")
      writeFileSync(path, source)

      try {
        const ReproClient = yield* Effect.tryPromise(() => import(pathToFileURL(path).href))
        let recordedRequest: HttpClientRequest.HttpClientRequest | undefined
        let transformCount = 0
        const recordingClient = HttpClient.make((request) => {
          recordedRequest = request
          return Effect.succeed(
            HttpClientResponse.fromWeb(request, new Response(new Uint8Array([1, 2, 3])))
          )
        }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.test")))
        const client = ReproClient.make(recordingClient, {
          transformClient: (httpClient) => {
            transformCount += 1
            return Effect.succeed(
              httpClient.pipe(HttpClient.mapRequest(HttpClientRequest.setHeader("x-transformed", "yes")))
            )
          }
        })

        const stream = client.downloadStream()
        assert.strictEqual(transformCount, 0)
        yield* Effect.promise(() => Effect.runPromise(stream.pipe(Stream.runCollect)))
        assert.strictEqual(recordedRequest?.headers["x-transformed"], "yes")
        assert.strictEqual(transformCount, 1)
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    }).pipe(Effect.provide(OpenApiGenerator.layerTransformerSchema)))
})
