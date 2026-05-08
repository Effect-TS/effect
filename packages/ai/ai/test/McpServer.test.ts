import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Mailbox, Sink } from "effect"
import * as McpServer from "../src/McpServer.js"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const initializeRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-client", version: "0.0.0" }
  }
}

const initializeResultFor = (
  options: { readonly instructions?: string | undefined }
): Effect.Effect<any> =>
  Effect.gen(function*() {
    const stdinMailbox = yield* Mailbox.make<Uint8Array>()
    const stdoutMailbox = yield* Mailbox.make<Uint8Array | string>()

    const stdin = Mailbox.toStream(stdinMailbox)
    const stdout = Sink.forEach((chunk: Uint8Array | string) => stdoutMailbox.offer(chunk))

    const ServerLayer = McpServer.layerStdio({
      name: "test-server",
      version: "1.0.0",
      stdin,
      stdout,
      ...(options.instructions !== undefined ? { instructions: options.instructions } : {})
    })

    yield* Effect.forkScoped(Layer.launch(ServerLayer))

    yield* stdinMailbox.offer(encoder.encode(JSON.stringify(initializeRequest) + "\n"))

    let response: any
    while (response === undefined) {
      const chunk = yield* stdoutMailbox.take
      const text = typeof chunk === "string" ? chunk : decoder.decode(chunk)
      for (const line of text.split("\n")) {
        if (line.trim() === "") continue
        const parsed = JSON.parse(line)
        if (parsed.id === 1) {
          response = parsed
          break
        }
      }
    }

    return response
  }).pipe(Effect.scoped) as Effect.Effect<any>

describe("McpServer", () => {
  describe("instructions", () => {
    it.effect("returns instructions in InitializeResult when set", () =>
      Effect.gen(function*() {
        const response = yield* initializeResultFor({ instructions: "be helpful" })
        assert.strictEqual(response.result.instructions, "be helpful")
        assert.deepStrictEqual(response.result.serverInfo, {
          name: "test-server",
          version: "1.0.0"
        })
      }))

    it.effect("omits instructions in InitializeResult when not set", () =>
      Effect.gen(function*() {
        const response = yield* initializeResultFor({})
        assert.isFalse("instructions" in response.result)
      }))
  })
})
