import { assert } from "@effect/vitest"
import * as McpSchema from "effect/ai/McpSchema"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type { JsonRpcMessage } from "./McpStdioHarness.ts"

export const readMcpHttpResponse = (response: Response): Effect.Effect<unknown> =>
  Effect.promise(async () => {
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      return response.json()
    }
    const messages = (await response.text())
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)))
    return messages.at(-1)
  })

export const makeMcpSseReader = (response: Response) => {
  assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream(?:;|$)/)
  const body = response.body
  assert.isNotNull(body)
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  const takeOrEnd = Effect.fnUntraced(function*() {
    while (true) {
      const boundary = pending.indexOf("\n\n")
      if (boundary !== -1) {
        const event = pending.slice(0, boundary)
        pending = pending.slice(boundary + 2)
        const data = event.split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
        if (data.length > 0) {
          return JSON.parse(data) as JsonRpcMessage
        }
        continue
      }
      const chunk = yield* Effect.promise(() => reader.read())
      if (chunk.done) {
        return undefined
      }
      pending += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n")
    }
  })
  const take = Effect.fnUntraced(function*() {
    const message = yield* takeOrEnd()
    assert.isDefined(message)
    return message
  })
  return {
    take,
    drain: Effect.fnUntraced(function*() {
      const messages: Array<JsonRpcMessage> = []
      while (true) {
        const message = yield* takeOrEnd()
        if (message === undefined) {
          return messages
        }
        messages.push(message)
      }
    }),
    cancel: Effect.promise(() => reader.cancel())
  }
}

// Shared JSON observations for the server protocol and SQL reconstruction tests.
// Protocol assertions use independently stated JSON fields, not the adapter's own decoder.
// https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#tasks
const taskFields = {
  taskId: Schema.String,
  createdAt: Schema.String,
  lastUpdatedAt: Schema.String,
  ttlMs: Schema.NullOr(Schema.Int),
  pollIntervalMs: Schema.optionalKey(Schema.Int),
  statusMessage: Schema.optionalKey(Schema.String)
}

export const McpCreatedTask = Schema.Struct({
  ...taskFields,
  resultType: Schema.Literal("task"),
  status: Schema.Literals(["working", "input_required", "completed", "failed", "cancelled"])
})

export const McpTaskSnapshot = Schema.Union([
  Schema.Struct({
    ...taskFields,
    resultType: Schema.Literal("complete"),
    status: Schema.Literals(["working", "cancelled"])
  }),
  Schema.Struct({
    ...taskFields,
    resultType: Schema.Literal("complete"),
    status: Schema.Literal("input_required"),
    inputRequests: Schema.Record(Schema.String, Schema.JsonObject)
  }),
  Schema.Struct({
    ...taskFields,
    resultType: Schema.Literal("complete"),
    status: Schema.Literal("completed"),
    result: McpSchema.CallToolResult
  }),
  Schema.Struct({
    ...taskFields,
    resultType: Schema.Literal("complete"),
    status: Schema.Literal("failed"),
    error: McpSchema.McpErrorBase
  })
])

export const assertMcpTaskAcknowledgement = (body: unknown) => {
  const { result } = Schema.decodeUnknownSync(Schema.Struct({ result: Schema.Record(Schema.String, Schema.Unknown) }))(
    body
  )
  const { _meta, ...acknowledgement } = result
  assert.deepStrictEqual(acknowledgement, { resultType: "complete" })
}
