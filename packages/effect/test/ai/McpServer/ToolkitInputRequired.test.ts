import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

// SEP-2322: https://modelcontextprotocol.io/seps/2322-MRTR
// https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr

class ConfirmationRequired extends Schema.TaggedError<ConfirmationRequired>()("ConfirmationRequired", {
  noteId: Schema.String
}) {}

const archiveTool = <const Name extends string>(name: Name, failureMode: "error" | "return") =>
  Tool.make(name, {
    parameters: Schema.Struct({ noteId: Schema.String }),
    success: Schema.Struct({ archived: Schema.String }),
    failure: ConfirmationRequired,
    failureMode,
    dependencies: [McpSchema.McpRequestContext]
  })

const ArchiveToolkit = Toolkit.make(archiveTool("ArchiveNote", "error"), archiveTool("ArchiveNoteReturn", "return"))

// Signs the note id into `requestState`, so any instance holding the key can verify a retry.
class StateSigner extends Context.Service<StateSigner, {
  readonly sign: (noteId: string) => Effect.Effect<string>
  readonly verify: (state: string, noteId: string) => Effect.Effect<boolean>
}>()("test/StateSigner") {}

const encoder = new TextEncoder()

const StateSignerLayer = Layer.effect(
  StateSigner,
  Effect.gen(function*() {
    const mac = yield* Mac.Mac
    const key = yield* Mac.key(Mac.hmacSha256, encoder.encode("shared requestState key"))
    return StateSigner.of({
      sign: (noteId) =>
        mac.sign(key, encoder.encode(noteId)).pipe(
          Effect.map((tag) => `${Base64Url.encode(noteId)}.${Base64Url.encode(tag)}`),
          Effect.orDie
        ),
      verify: (state, noteId) => {
        const [payload = "", tag = ""] = state.split(".")
        const decodedPayload = Base64Url.decode(payload)
        const decodedTag = Base64Url.decode(tag)
        if (Result.isFailure(decodedPayload) || Result.isFailure(decodedTag)) return Effect.succeed(false)
        return new TextDecoder().decode(decodedPayload.success) === noteId
          ? Effect.orDie(mac.verify(key, decodedTag.success, decodedPayload.success))
          : Effect.succeed(false)
      }
    })
  })
).pipe(Layer.provide(Mac.layerWebCrypto), Layer.provide(SecureRandom.layerWebCrypto))

const confirmRequest = (noteId: string): McpSchema.McpInputRequest => ({
  method: "elicitation/create",
  params: {
    message: `Archive note ${noteId}?`,
    requestedSchema: {
      type: "object",
      properties: { confirmed: { type: "boolean" } },
      required: ["confirmed"]
    }
  }
})

const confirmation = { confirm: { action: "accept", content: { confirmed: true } } }

const handleArchive = (archived: Ref.Ref<ReadonlyArray<string>>, signer: StateSigner["Service"]) =>
  Effect.fnUntraced(function*({ noteId }: { readonly noteId: string }) {
    const request = yield* McpSchema.McpRequestContext
    const confirm = request.inputResponses?.confirm
    const confirmed = request.requestState !== undefined &&
      (yield* signer.verify(request.requestState, noteId)) &&
      confirm?.action === "accept" &&
      (confirm.content as { readonly confirmed?: unknown } | undefined)?.confirmed === true
    if (!confirmed) return yield* new ConfirmationRequired({ noteId })
    yield* Ref.update(archived, (notes) => [...notes, noteId])
    return { archived: noteId }
  })

// One server instance. Instances share only the signing key and the archive store.
const makeInstance = (
  archived: Ref.Ref<ReadonlyArray<string>>,
  mapped: Ref.Ref<number>,
  protocol: McpProtocol.ProtocolAdapter
) => {
  const mapError = Effect.fnUntraced(function*(error: ConfirmationRequired) {
    yield* Ref.update(mapped, (count) => count + 1)
    if (error.noteId.startsWith("locked")) return undefined
    const signer = yield* StateSigner
    return new McpSchema.InputRequired({
      inputRequests: { confirm: confirmRequest(error.noteId) },
      requestState: yield* signer.sign(error.noteId)
    })
  })
  return McpServer.toolkit(ArchiveToolkit, {
    inputRequired: { ArchiveNote: mapError, ArchiveNoteReturn: mapError }
  }).pipe(
    Layer.provide(ArchiveToolkit.toLayer(Effect.gen(function*() {
      const handler = handleArchive(archived, yield* StateSigner)
      return { ArchiveNote: handler, ArchiveNoteReturn: handler }
    }))),
    Layer.provide(makeServerLayer({ name: "ToolkitInputRequired", protocols: [protocol] })),
    Layer.provide(StateSignerLayer)
  )
}

const statelessCall = Effect.fnUntraced(function*(
  harness: Effect.Success<ReturnType<typeof makeHttpHarness>>,
  params: { readonly name: string } & Readonly<Record<string, unknown>>,
  clientCapabilities: Record<string, unknown> = { elicitation: { form: {} } }
) {
  const response = yield* harness.post({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": clientCapabilities,
        "io.modelcontextprotocol/clientInfo": { name: "ToolkitInputRequiredClient", version: "1.0.0" }
      }
    }
  }, {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/call",
    "Mcp-Name": params.name
  })
  return { status: response.status, message: (yield* readMcpHttpResponse(response)) as Record<string, any> }
})

const makeInstances = Effect.fnUntraced(function*() {
  const archived = yield* Ref.make<ReadonlyArray<string>>([])
  const mapped = yield* Ref.make(0)
  const first = yield* makeHttpHarness(makeInstance(archived, mapped, McpProtocol.v2026_07_28))
  const second = yield* makeHttpHarness(makeInstance(archived, mapped, McpProtocol.v2026_07_28))
  return { archived, mapped, first, second } as const
})

describe("McpServer.toolkit inputRequired", () => {
  for (const name of ["ArchiveNote", "ArchiveNoteReturn"] as const) {
    it.effect(`should resume on another instance when ${name} is retried with input responses and its state`, () =>
      Effect.gen(function*() {
        const { archived, first, second } = yield* makeInstances()

        const pending = yield* statelessCall(first, { name, arguments: { noteId: "n1" } })

        assert.strictEqual(pending.message.result.resultType, "input_required")
        assert.deepStrictEqual(pending.message.result.inputRequests, { confirm: confirmRequest("n1") })
        assert.isString(pending.message.result.requestState)
        assert.deepStrictEqual(yield* Ref.get(archived), [])

        const completed = yield* statelessCall(second, {
          name,
          arguments: { noteId: "n1" },
          inputResponses: confirmation,
          requestState: pending.message.result.requestState
        })

        assert.strictEqual(completed.message.result.resultType, "complete")
        assert.strictEqual(completed.message.result.isError, false)
        assert.deepStrictEqual(completed.message.result.structuredContent, { archived: "n1" })
        assert.deepStrictEqual(yield* Ref.get(archived), ["n1"])
      }))

    it.effect(`should request input again without side effects when ${name} is retried with a tampered state`, () =>
      Effect.gen(function*() {
        const { archived, first, second } = yield* makeInstances()
        const pending = yield* statelessCall(first, { name, arguments: { noteId: "n1" } })
        const otherNote = yield* statelessCall(first, { name, arguments: { noteId: "n2" } })
        const state: string = pending.message.result.requestState
        const [payload, tag] = state.split(".")
        const tampered = [
          // The tag no longer matches the payload.
          `${payload}.${tag.startsWith("A") ? "B" : "A"}${tag.slice(1)}`,
          // A valid state for another note is replayed against this call's arguments.
          otherNote.message.result.requestState,
          "not-a-state"
        ]

        for (const requestState of tampered) {
          const retried = yield* statelessCall(second, {
            name,
            arguments: { noteId: "n1" },
            inputResponses: confirmation,
            requestState
          })
          assert.strictEqual(retried.message.result.resultType, "input_required")
          assert.strictEqual(retried.message.result.requestState, state)
        }
        assert.deepStrictEqual(yield* Ref.get(archived), [])
      }))
  }

  it.effect("should keep the isError result when the mapper returns undefined", () =>
    Effect.gen(function*() {
      const { mapped, first } = yield* makeInstances()

      const result = yield* statelessCall(first, { name: "ArchiveNote", arguments: { noteId: "locked-1" } })

      assert.strictEqual(result.message.result.resultType, "complete")
      assert.strictEqual(result.message.result.isError, true)
      assert.deepStrictEqual(result.message.result.content, [{
        type: "text",
        text: JSON.stringify({ _tag: "ConfirmationRequired", noteId: "locked-1" })
      }])
      assert.strictEqual(yield* Ref.get(mapped), 1)
    }))

  it.effect("should reject the mapped input request when the client omits the elicitation capability", () =>
    Effect.gen(function*() {
      const { first } = yield* makeInstances()

      const result = yield* statelessCall(first, { name: "ArchiveNote", arguments: { noteId: "n1" } }, {})

      assert.strictEqual(result.status, 400)
      assert.strictEqual(result.message.error.code, -32021)
      assert.deepStrictEqual(result.message.error.data, { requiredCapabilities: { elicitation: { form: {} } } })
    }))

  it.effect("should keep the isError result without running the mapper when the protocol has no client input", () =>
    Effect.gen(function*() {
      const archived = yield* Ref.make<ReadonlyArray<string>>([])
      const mapped = yield* Ref.make(0)
      const harness = yield* makeHttpHarness(makeInstance(archived, mapped, McpProtocol.v2025_11_25))
      const headers = yield* initializeHttpSession(harness, McpProtocol.v2025_11_25, { elicitation: { form: {} } })

      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "ArchiveNote", arguments: { noteId: "n1" } }
      }, headers)
      const message = (yield* readMcpHttpResponse(response)) as Record<string, any>

      assert.strictEqual(message.result.isError, true)
      assert.deepStrictEqual(message.result.content, [{
        type: "text",
        text: JSON.stringify({ _tag: "ConfirmationRequired", noteId: "n1" })
      }])
      assert.strictEqual(yield* Ref.get(mapped), 0)
    }))
})
