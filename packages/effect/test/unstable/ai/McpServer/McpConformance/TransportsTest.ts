import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpServer from "effect/unstable/ai/McpServer"
import { MCP_ENDPOINT } from "../McpServerTest.ts"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

const jsonRequest = (method: string, body?: unknown, headers?: HeadersInit) => {
  const requestHeaders = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json"
  })
  new Headers(headers).forEach((value, name) => requestHeaders.set(name, value))
  return new Request(MCP_ENDPOINT, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
}

const makeStdioFixture = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter,
  protocols: ReadonlyArray<McpProtocol.ProtocolAdapter> = [protocol]
) {
  const stdin = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const stdout = yield* Queue.unbounded<string | Uint8Array>()
  const stderr = yield* Queue.unbounded<string | Uint8Array>()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const stdioLayer = Stdio.layerTest({
    stdin: Stream.fromQueue(stdin),
    stdout: () => Sink.forEach((chunk) => Queue.offer(stdout, chunk)),
    stderr: () => Sink.forEach((chunk) => Queue.offer(stderr, chunk))
  })
  const ready = yield* Deferred.make<void>()
  const server = yield* Effect.gen(function*() {
    yield* Layer.build(
      McpServer.layerStdio({
        name: "McpConformance",
        version: "1.0.0",
        protocols: protocols as [
          McpProtocol.ProtocolAdapter,
          ...Array<McpProtocol.ProtocolAdapter>
        ]
      }).pipe(Layer.provide(stdioLayer))
    )
    yield* Deferred.succeed(ready, undefined)
    return yield* Effect.never
  }).pipe(Effect.scoped, Effect.forkScoped)
  yield* Deferred.await(ready)

  return {
    close: Queue.end(stdin),
    read: Effect.fnUntraced(function*() {
      const chunk = yield* Queue.take(stdout)
      return typeof chunk === "string" ? chunk : decoder.decode(chunk)
    }),
    server,
    write: (message: unknown) => Queue.offer(stdin, encoder.encode(`${JSON.stringify(message)}\n`))
  } as const
})

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe(
      protocol.protocolVersion === "2024-11-05"
        ? "Transports (Option A compatibility contract)"
        : "Transports",
      () => {
        // https://modelcontextprotocol.io/specification/2024-11-05/basic/transports
        // https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
        describe("stdio", () => {
          it.effect("MUST exchange compact UTF-8 newline-delimited JSON-RPC records", () =>
            Effect.gen(function*() {
              const fixture = yield* makeStdioFixture(protocol)
              yield* fixture.write({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                  protocolVersion: protocol.protocolVersion,
                  capabilities: {},
                  clientInfo: { name: "stdio-client", version: "1.0.0" }
                }
              })
              const frame = yield* fixture.read()
              assert.strictEqual(frame.endsWith("\n"), true)
              assert.strictEqual(frame.slice(0, -1).includes("\n"), false)
              const message = JSON.parse(frame)
              assert.deepInclude(message, { jsonrpc: "2.0", id: 1 })
              assert.property(message, "result")
            }))

          it.effect("SCENARIO processes consecutive stdio messages independently", () =>
            Effect.gen(function*() {
              const fixture = yield* makeStdioFixture(protocol)
              yield* fixture.write({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                  protocolVersion: protocol.protocolVersion,
                  capabilities: {},
                  clientInfo: { name: "stdio-client", version: "1.0.0" }
                }
              })
              yield* fixture.read()
              yield* fixture.write({ jsonrpc: "2.0", id: 2, method: "ping", params: {} })
              yield* fixture.write({ jsonrpc: "2.0", id: 3, method: "ping", params: {} })
              assert.deepStrictEqual(JSON.parse(yield* fixture.read()), {
                jsonrpc: "2.0",
                id: 2,
                result: {}
              })
              assert.deepStrictEqual(JSON.parse(yield* fixture.read()), {
                jsonrpc: "2.0",
                id: 3,
                result: {}
              })
            }))

          it.effect("SCENARIO applies the revision-specific stdio batch policy", () =>
            Effect.gen(function*() {
              const fixture = yield* makeStdioFixture(protocol)
              yield* fixture.write({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                  protocolVersion: protocol.protocolVersion,
                  capabilities: {},
                  clientInfo: { name: "stdio-client", version: "1.0.0" }
                }
              })
              yield* fixture.read()
              yield* fixture.write([
                { jsonrpc: "2.0", id: 2, method: "ping", params: {} },
                { jsonrpc: "2.0", id: 3, method: "ping", params: {} }
              ])
              const response = JSON.parse(yield* fixture.read())
              if (protocol.transport.acceptsOperationalBatches) {
                assert.deepStrictEqual(response, [
                  { jsonrpc: "2.0", id: 2, result: {} },
                  { jsonrpc: "2.0", id: 3, result: {} }
                ])
              } else {
                assert.property(response, "error")
              }
            }))

          if (protocol.transport.acceptsOperationalBatches) {
            it.effect("SCENARIO applies fallback negotiation to subsequent stdio batches", () =>
              Effect.gen(function*() {
                const fixture = yield* makeStdioFixture(protocol)
                yield* fixture.write({
                  jsonrpc: "2.0",
                  id: 1,
                  method: "initialize",
                  params: {
                    protocolVersion: "unsupported-version",
                    capabilities: {},
                    clientInfo: { name: "stdio-client", version: "1.0.0" }
                  }
                })
                const initialized = JSON.parse(yield* fixture.read())
                assert.strictEqual(initialized.result.protocolVersion, protocol.protocolVersion)
                yield* fixture.write([
                  { jsonrpc: "2.0", id: 2, method: "ping", params: {} },
                  { jsonrpc: "2.0", id: 3, method: "ping", params: {} }
                ])
                assert.deepStrictEqual(JSON.parse(yield* fixture.read()), [
                  { jsonrpc: "2.0", id: 2, result: {} },
                  { jsonrpc: "2.0", id: 3, result: {} }
                ])
              }))
          }

          it.effect("MUST shut down when the client closes stdin", () =>
            Effect.gen(function*() {
              const fixture = yield* makeStdioFixture(protocol)
              yield* fixture.close
              const exit = yield* Fiber.await(fixture.server)
              assert.isTrue(
                Exit.isSuccess(exit) ||
                  (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
              )
            }))
        })

        describe(
          protocol.protocolVersion === "2024-11-05"
            ? "Streamable HTTP compatibility extension (not historical HTTP+SSE)"
            : "Streamable HTTP",
          () => {
            describe("Sending Messages to the Server", () => {
              it.effect("MUST accept JSON-RPC requests through POST on the MCP endpoint", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const response = yield* test.post(test.initializeRequest())

                  assert.strictEqual(response.status, 200)
                }))

              it.effect("MUST accept JSON-RPC notifications through POST on the MCP endpoint", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const response = yield* test.notifyInitialized(initialized)

                  assert.strictEqual(response.status, 202)
                  assert.strictEqual(yield* Effect.promise(() => response.text()), "")
                }))

              it.effect("MUST accept JSON-RPC responses through POST on the MCP endpoint", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const response = yield* test.send(initialized, {
                    jsonrpc: "2.0",
                    id: 99,
                    result: {}
                  })

                  assert.strictEqual(response.status, 202)
                  assert.strictEqual(yield* Effect.promise(() => response.text()), "")
                }))

              it.effect("MUST require the application/json content type for POST requests", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const accepted = yield* test.request(jsonRequest("POST", test.initializeRequest(), {
                    "content-type": "Application/JSON; charset=utf-8"
                  }))
                  assert.strictEqual(accepted.status, 200)

                  for (const contentType of ["text/plain", "application/json-malicious", ""]) {
                    const response = yield* test.request(jsonRequest("POST", test.initializeRequest(), {
                      "content-type": contentType
                    }))
                    assert.strictEqual(response.status, 415)
                  }
                }))

              it.effect("MUST require clients to accept application/json and text/event-stream", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const accepted = yield* test.request(jsonRequest("POST", test.initializeRequest(), {
                    accept: " Text/Event-Stream; q=0.9, Application/JSON "
                  }))
                  assert.strictEqual(accepted.status, 200)

                  for (
                    const accept of [
                      "application/json",
                      "text/event-stream",
                      "*/*",
                      "application/json, text/event-stream; q=0",
                      "application/json, text/event-stream; q=bogus",
                      "application/json, text/event-stream; q=2",
                      "application/json, text/event-stream; q=-1",
                      "application/json-malicious, text/event-stream",
                      ""
                    ]
                  ) {
                    const response = yield* test.request(jsonRequest("POST", test.initializeRequest(), { accept }))
                    assert.strictEqual(response.status, 406)
                  }
                }))

              it.effect("MUST return application/json for a single JSON-RPC response", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const response = yield* test.post(test.initializeRequest())

                  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/)
                }))
              it.effect("MUST return an empty 202 response for accepted notifications and responses", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const notification = yield* test.notifyInitialized(initialized)
                  const response = yield* test.send(initialized, {
                    jsonrpc: "2.0",
                    id: 99,
                    result: {}
                  })

                  assert.strictEqual(notification.status, 202)
                  assert.strictEqual(yield* Effect.promise(() => notification.text()), "")
                  assert.strictEqual(response.status, 202)
                  assert.strictEqual(yield* Effect.promise(() => response.text()), "")
                }))

              it.effect("MUST reject unsupported HTTP methods with method not allowed", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  for (const method of ["PUT", "PATCH", "HEAD"] as const) {
                    const response = yield* test.request(jsonRequest(method))
                    assert.strictEqual(response.status, 405)
                  }
                }))
            })

            describe("Listening for Messages from the Server", () => {
              it.effect("MUST return method not allowed when GET SSE is not offered", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const response = yield* test.request(jsonRequest("GET"))
                  assert.strictEqual(response.status, 405)
                  assert.strictEqual(response.headers.get("allow"), "POST")
                }))
            })

            describe("Session Management", () => {
              it.effect("SCENARIO returns an MCP session identifier during initialization", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()

                  assert.isNotNull(initialized.sessionId)
                }))
              it.effect("SCENARIO uses distinct UUIDv4 session identifiers", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const first = yield* test.initialize()
                  const second = yield* test.initialize({ id: 2 })
                  assert.match(
                    first.sessionId ?? "",
                    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
                  )
                  assert.match(
                    second.sessionId ?? "",
                    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
                  )
                  assert.notStrictEqual(first.sessionId, second.sessionId)
                }))
              it.effect("MUST require the returned session identifier on subsequent HTTP requests", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  yield* test.initialize()
                  const response = yield* test.request(jsonRequest("POST", test.pingRequest(), {
                    "Mcp-Protocol-Version": protocol.protocolVersion
                  }))
                  assert.strictEqual(response.status, 400)
                }))
              it.effect("MUST reject an unknown session identifier with not found", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const response = yield* test.request(jsonRequest("POST", test.pingRequest(), {
                    "Mcp-Protocol-Version": protocol.protocolVersion,
                    "Mcp-Session-Id": "unknown-session"
                  }))

                  assert.strictEqual(response.status, 404)
                }))
              it.effect("SCENARIO declines client session termination without invalidating the session", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  assert.isNotNull(initialized.sessionId)
                  const response = yield* test.request(jsonRequest("DELETE", undefined, {
                    "Mcp-Protocol-Version": protocol.protocolVersion,
                    "Mcp-Session-Id": initialized.sessionId
                  }))
                  assert.strictEqual(response.status, 405)
                  assert.strictEqual(response.headers.get("allow"), "POST")
                  assert.strictEqual((yield* test.ping(initialized)).status, 200)
                }))
              it.effect("MUST reject initialize requests carrying a session identifier", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const repeated = yield* test.send(initialized, test.initializeRequest({ id: 2 }))
                  assert.strictEqual(repeated.status, 400)
                  const unknown = yield* test.request(jsonRequest("POST", test.initializeRequest({ id: 3 }), {
                    "Mcp-Session-Id": "unknown-session"
                  }))
                  assert.strictEqual(unknown.status, 404)
                }))
              it.effect("SCENARIO keeps two distinct POST sessions live", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const first = yield* test.initialize()
                  const second = yield* test.initialize({ id: 2 })
                  assert.strictEqual((yield* test.ping(first, { id: 3 })).status, 200)
                  assert.strictEqual((yield* test.ping(second, { id: 4 })).status, 200)
                }))
            })

            describe("Protocol Version Header", () => {
              it.effect("MUST apply the revision-specific protocol header requirement", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const response = yield* test.ping(initialized, {
                    includeProtocolVersion: false
                  })
                  assert.strictEqual(
                    response.status,
                    protocol.transport.requiresProtocolVersionHeaderOnSubsequentHttpRequests ? 400 : 200
                  )
                }))
              it.effect("MUST accept the negotiated protocol version", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const response = yield* test.ping(initialized, {
                    includeProtocolVersion: true,
                    protocolVersion: protocol.protocolVersion
                  })
                  assert.strictEqual(response.status, 200)
                }))
              it.effect("MUST reject an unsupported protocol version with bad request", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  const response = yield* test.ping(initialized, {
                    includeProtocolVersion: true,
                    protocolVersion: "2099-01-01"
                  })
                  assert.strictEqual(response.status, 400)
                }))
              it.effect("SCENARIO replays the selected protocol version on HTTP responses", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  const initialized = yield* test.initialize()
                  assert.strictEqual(
                    initialized.response.headers.get("Mcp-Protocol-Version"),
                    protocol.protocolVersion
                  )
                  const response = yield* test.ping(initialized, { includeProtocolVersion: true })
                  assert.strictEqual(response.headers.get("Mcp-Protocol-Version"), protocol.protocolVersion)
                }))
            })

            describe("Security", () => {
              it.effect("MUST validate the Origin header before every MCP route", () =>
                Effect.gen(function*() {
                  const test = yield* McpConformanceTest
                  assert.strictEqual((yield* test.post(test.initializeRequest())).status, 200)
                  assert.strictEqual(
                    (yield* test.request(jsonRequest("POST", test.initializeRequest({ id: 2 }), {
                      origin: "https://allowed.example"
                    }))).status,
                    200
                  )
                  for (const method of ["POST", "GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const) {
                    const response = yield* test.request(jsonRequest(
                      method,
                      method === "POST" ? test.initializeRequest({ id: 3 }) : undefined,
                      { origin: "https://attacker.example" }
                    ))
                    assert.strictEqual(response.status, 403)
                  }
                }))
            })
          }
        )
      }
    )
  })
