import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
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

const sseSpec: OpenAPISpec = {
  ...spec,
  paths: {
    "/events": {
      get: {
        operationId: "events",
        parameters: [],
        responses: {
          "200": {
            description: "events",
            content: {
              "text/event-stream": {
                schema: { type: "string" }
              }
            }
          }
        },
        tags: ["Repro"],
        security: []
      }
    }
  }
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
        let executionCount = 0
        let responseStatus = 200
        let transformCount = 0
        const recordingClient = HttpClient.make((request) => {
          executionCount += 1
          recordedRequest = request
          return Effect.succeed(
            HttpClientResponse.fromWeb(request, new Response(new Uint8Array([1, 2, 3]), { status: responseStatus }))
          )
        }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.test")))
        const client = ReproClient.make(recordingClient, {
          transformClient: (httpClient: HttpClient.HttpClient) => {
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
        yield* Effect.promise(() => Effect.runPromise(stream.pipe(Stream.runCollect)))
        assert.strictEqual(transformCount, 2)

        const untransformedClient = ReproClient.make(recordingClient)
        yield* Effect.promise(() => Effect.runPromise(untransformedClient.downloadStream().pipe(Stream.runCollect)))
        assert.strictEqual(executionCount, 3)
        assert.strictEqual(recordedRequest?.headers["x-transformed"], undefined)

        responseStatus = 500
        const exit = yield* Effect.promise(() =>
          Effect.runPromise(Effect.exit(untransformedClient.downloadStream().pipe(Stream.runCollect)))
        )
        assert.isTrue(Exit.isFailure(exit))
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    }).pipe(Effect.provide(OpenApiGenerator.layerTransformerSchema)))

  it.effect("routes type-only binary and SSE streams through the shared executor", () =>
    Effect.gen(function*() {
      const generator = yield* OpenApiGenerator.OpenApiGenerator
      const binarySource = yield* generator.generate(spec, {
        name: "ReproClient",
        format: "httpclient-type-only"
      })
      const sseSource = yield* generator.generate(sseSpec, {
        name: "ReproClient",
        format: "httpclient-type-only"
      })

      assert.include(
        binarySource,
        `const binaryRequest = (request: HttpClientRequest.HttpClientRequest): Stream.Stream<Uint8Array, HttpClientError.HttpClientError> =>\n    executeStreamRequest(request).pipe(`
      )
      assert.include(
        sseSource,
        `const sseRequest = (request: HttpClientRequest.HttpClientRequest): Stream.Stream<unknown, HttpClientError.HttpClientError> =>\n    executeStreamRequest(request).pipe(`
      )
    }).pipe(Effect.provide(OpenApiGenerator.layerTransformerTs)))
})
