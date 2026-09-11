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
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
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

interface GeneratedClient {
  readonly getUser: (userId: string, options?: undefined) => Effect.Effect<void, HttpClientError.HttpClientError>
  readonly updateUser: (userId: string, options?: undefined) => Effect.Effect<void, HttpClientError.HttpClientError>
  readonly watchChannelSse: (channelId: string) => Stream.Stream<unknown, unknown>
  readonly downloadFileStream: (fileId: string) => Stream.Stream<unknown, unknown>
  readonly trigger: () => unknown
  readonly triggerSse: () => unknown
  readonly triggerStream: () => unknown
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
  try {
    const { output } = await bundle.generate({ format: "cjs" })
    const compiled = output[0]
    assert.strictEqual(compiled.type, "chunk")
    const exports = {} as {
      make: (httpClient: HttpClient.HttpClient) => GeneratedClient
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

const formats = ["httpclient", "httpclient-type-only"] as const

const layerFor = (format: (typeof formats)[number]) =>
  format === "httpclient" ? OpenApiGenerator.layerTransformerSchema : OpenApiGenerator.layerTransformerTs

const pathParam = (name: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const }
})

/**
 * A credentialed upstream API: ordinary JSON methods, an SSE method and a
 * binary download method, each behind a path parameter.
 */
const upstreamSpec: OpenAPISpec = {
  openapi: "3.1.0",
  info: { title: "Trusted upstream", version: "1.0.0" },
  components: { schemas: {}, securitySchemes: {} },
  security: [],
  tags: [],
  paths: {
    "/api/users/{userId}": {
      get: {
        operationId: "getUser",
        parameters: [pathParam("userId")],
        tags: ["Users"],
        security: [],
        responses: { "204": { description: "No content" } }
      },
      put: {
        operationId: "updateUser",
        parameters: [pathParam("userId")],
        tags: ["Users"],
        security: [],
        responses: { "204": { description: "No content" } }
      }
    },
    "/api/channels/{channelId}/events": {
      get: {
        operationId: "watchChannel",
        parameters: [pathParam("channelId")],
        tags: ["Streams"],
        security: [],
        responses: {
          "200": {
            description: "Events",
            content: { "text/event-stream": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/api/files/{fileId}/download": {
      get: {
        operationId: "downloadFile",
        parameters: [pathParam("fileId")],
        tags: ["Streams"],
        security: [],
        responses: {
          "200": {
            description: "Download",
            content: { "application/octet-stream": { schema: { type: "string" } } }
          }
        }
      }
    }
  }
}

const serviceToken = "trusted-service-token"

interface RecordedRequest {
  readonly method: string
  readonly url: string
  readonly authorization: string | undefined
}

/**
 * An in-process upstream which records the resolved request URL and the
 * Authorization header it received. The generated client is given a fixed
 * base URL and a service credential.
 */
const recordingUpstream = (
  requests: Array<RecordedRequest>,
  body: string | Uint8Array | null = null,
  status = 204
) =>
  HttpClient.make((request, url) => {
    requests.push({
      method: request.method,
      url: url.href,
      authorization: request.headers.authorization
    })
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body, { status })))
  }).pipe(
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.prependUrl("https://trusted-upstream.example"),
        HttpClientRequest.bearerToken(serviceToken)
      )
    )
  )

/**
 * A path parameter value must be serialized as a single segment of the
 * declared path. Rejecting a hostile value before any request is sent is
 * acceptable; sending a request whose path escapes the declared structure,
 * or which injects a query string or fragment, is not.
 */
const assertContained = (
  requests: ReadonlyArray<RecordedRequest>,
  prefix: string,
  value: string
) => {
  if (requests.length === 0) return
  assert.strictEqual(requests.length, 1)
  const url = new URL(requests[0].url)
  assert.ok(
    url.pathname.startsWith(prefix) && url.pathname.length > prefix.length,
    `path parameter ${JSON.stringify(value)} escaped the declared path structure: ${url.pathname}`
  )
  assert.strictEqual(
    url.search,
    "",
    `path parameter ${JSON.stringify(value)} injected a query string: ${url.href}`
  )
  assert.strictEqual(
    url.hash,
    "",
    `path parameter ${JSON.stringify(value)} injected a fragment: ${url.href}`
  )
}

/**
 * Hostile path parameter values. Each must remain a single literal segment
 * (or be rejected) — never a path delimiter, dot segment, query or fragment.
 */
const hostileValues = [
  "../admin/secret",
  "..",
  ".",
  "%2e%2e",
  ".%2e",
  "%2e.",
  "a/b",
  "x?y",
  "x#y"
]

/**
 * A `paths` key which closes the generated template literal and splices an
 * arbitrary JavaScript expression into the generated client method.
 */
const codeInjectionPath = (marker: string) =>
  "/api/`) && (globalThis.process.getBuiltinModule(\"node:fs\").writeFileSync(" +
  JSON.stringify(marker) +
  ", \"OPENAPI_CODE_INJECTION\"), true) && HttpClientRequest.get(`/safe"

const codeInjectionSpec = (marker: string, variant: "ordinary" | "sse" | "binary"): OpenAPISpec => {
  const responses = variant === "ordinary"
    ? { "204": { description: "No content" } }
    : {
      "200": {
        description: "Success",
        content: variant === "sse"
          ? { "text/event-stream": { schema: { type: "string" as const } } }
          : { "application/octet-stream": { schema: { type: "string" as const } } }
      }
    }
  return {
    openapi: "3.1.0",
    info: { title: "Untrusted API", version: "1.0.0" },
    components: { schemas: {}, securitySchemes: {} },
    security: [],
    tags: [],
    paths: {
      [codeInjectionPath(marker)]: {
        get: {
          operationId: "trigger",
          tags: ["Trigger"],
          security: [],
          responses
        }
      }
    }
  }
}

describe("OpenAPI client path handling", () => {
  for (const format of formats) {
    describe(format, () => {
      const generate = (spec: OpenAPISpec) =>
        Effect.gen(function*() {
          const generator = yield* OpenApiGenerator.OpenApiGenerator
          const source = yield* generator.generate(spec, { name: "TestClient", format })
          return yield* Effect.promise(() => loadClient(source))
        }).pipe(Effect.provide(layerFor(format)))

      describe("runtime path parameter injection", () => {
        it.effect("ordinary methods address the declared endpoint for simple values", () =>
          Effect.gen(function*() {
            const make = yield* generate(upstreamSpec)
            const requests: Array<RecordedRequest> = []
            const client = make(recordingUpstream(requests))
            yield* client.getUser("alice", undefined)
            yield* client.updateUser("alice", undefined)
            assert.strictEqual(requests[0].url, "https://trusted-upstream.example/api/users/alice")
            assert.strictEqual(requests[1].url, "https://trusted-upstream.example/api/users/alice")
            assert.strictEqual(requests[1].method, "PUT")
          }))

        it.effect("ordinary methods cannot redirect the credentialed request", () =>
          Effect.gen(function*() {
            const make = yield* generate(upstreamSpec)
            const requests: Array<RecordedRequest> = []
            const client = make(recordingUpstream(requests))
            for (const value of hostileValues) {
              for (const method of [client.getUser, client.updateUser]) {
                requests.length = 0
                yield* Effect.result(method(value, undefined))
                assertContained(requests, "/api/users/", value)
              }
            }
          }))

        it.effect("the SSE method cannot redirect the credentialed request", () =>
          Effect.gen(function*() {
            const make = yield* generate(upstreamSpec)
            const requests: Array<RecordedRequest> = []
            const client = make(recordingUpstream(requests, "data: \"hello\"\n\n", 200))
            for (const value of hostileValues) {
              requests.length = 0
              yield* Effect.result(Stream.runCollect(client.watchChannelSse(value)))
              assertContained(requests, "/api/channels/", value)
            }
          }))

        it.effect("the binary stream method cannot redirect the credentialed request", () =>
          Effect.gen(function*() {
            const make = yield* generate(upstreamSpec)
            const requests: Array<RecordedRequest> = []
            const client = make(recordingUpstream(requests, new TextEncoder().encode("download"), 200))
            for (const value of hostileValues) {
              requests.length = 0
              yield* Effect.result(Stream.runCollect(client.downloadFileStream(value)))
              assertContained(requests, "/api/files/", value)
            }
          }))
      })

      describe("generated-source code injection", () => {
        for (const variant of ["ordinary", "sse", "binary"] as const) {
          const method = variant === "ordinary" ? "trigger" : variant === "sse" ? "triggerSse" : "triggerStream"
          it.effect(`a malicious paths key is emitted as inert data (${variant} method)`, () =>
            Effect.gen(function*() {
              const directory = mkdtempSync(join(tmpdir(), "openapi-codegen-injection-"))
              try {
                const marker = join(directory, "marker.txt")
                const make = yield* generate(codeInjectionSpec(marker, variant))
                // Generation and module import must not evaluate the path
                assert.isFalse(existsSync(marker))
                const client = make({ execute: () => Effect.void } as any)
                // ... and neither must calling the affected method
                client[method]()
                assert.isFalse(
                  existsSync(marker),
                  "the OpenAPI paths key was evaluated as JavaScript when the generated method was called"
                )
              } finally {
                rmSync(directory, { recursive: true, force: true })
              }
            }))
        }
      })
    })
  }

  describe("httpapi format", () => {
    it.effect("renders a malicious paths key as an inert string literal", () =>
      Effect.gen(function*() {
        const directory = mkdtempSync(join(tmpdir(), "openapi-codegen-injection-"))
        try {
          const marker = join(directory, "marker.txt")
          const generator = yield* OpenApiGenerator.OpenApiGenerator
          const source = yield* generator.generate(codeInjectionSpec(marker, "ordinary"), {
            name: "TestClient",
            format: "httpapi"
          })
          const path = codeInjectionPath(marker)
          assert.include(
            source,
            JSON.stringify(path),
            "the httpapi output must render the path as a quoted string literal"
          )
          assert.notInclude(source, "`" + path + "`")
        } finally {
          rmSync(directory, { recursive: true, force: true })
        }
      }).pipe(Effect.provide(OpenApiGenerator.layerTransformerSchema)))
  })
})
