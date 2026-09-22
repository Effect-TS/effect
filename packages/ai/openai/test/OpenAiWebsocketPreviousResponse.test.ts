import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { Chat } from "effect/unstable/ai"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as Socket from "effect/unstable/socket/Socket"
import { WS } from "vitest-websocket-mock"

const socketUrl = "wss://api.openai.com/v1/responses"

type ResponseCreate = {
  readonly type: "response.create"
  readonly previous_response_id?: string | undefined
  readonly input: ReadonlyArray<{
    readonly role?: string | undefined
    readonly id?: string | undefined
    readonly type?: string | undefined
    readonly content?:
      | ReadonlyArray<{ readonly type?: string | undefined; readonly text?: string | undefined }>
      | undefined
  }>
}

const responseBody = (id: string) => ({
  id,
  object: "response",
  model: "gpt-4o-mini",
  created_at: 1,
  output: [],
  error: null,
  incomplete_details: null
})

const completedTurn = (id: string, itemId: string, text: string) => [
  { type: "response.created", response: responseBody(id) },
  {
    type: "response.output_item.added",
    output_index: 0,
    item: {
      id: itemId,
      type: "message",
      role: "assistant",
      status: "in_progress",
      content: []
    }
  },
  {
    type: "response.output_text.delta",
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    delta: text
  },
  {
    type: "response.output_item.done",
    output_index: 0,
    item: {
      id: itemId,
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text, annotations: [] }]
    }
  },
  { type: "response.completed", response: responseBody(id) }
]

const previousResponseNotFound = {
  type: "error",
  status: 400,
  error: {
    code: "previous_response_not_found",
    message: "Previous response with id 'resp_1' not found.",
    param: "previous_response_id"
  }
}

const userInput = (text: string) => ({
  role: "user",
  content: [{ type: "input_text", text }]
})

const assistantInput = (id: string, text: string) => ({
  id,
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{
    type: "output_text",
    text,
    annotations: [],
    logprobs: []
  }]
})

describe("OpenAiClient websocket", () => {
  it.live("resends the full turn after previous_response_not_found and keeps later incremental sends", () =>
    Effect.gen(function*() {
      const server = yield* Effect.acquireRelease(
        Effect.sync(() => new WS(socketUrl, { jsonProtocol: true })),
        (server) =>
          Effect.sync(() => {
            server.close()
            WS.clean()
          })
      )
      const messages: Array<ResponseCreate> = []

      const drive = Effect.gen(function*() {
        const chat = yield* Chat.empty
        yield* chat.streamText({ prompt: "hello" }).pipe(Stream.runDrain)
        yield* chat.streamText({ prompt: "again" }).pipe(Stream.runDrain)
        yield* chat.streamText({ prompt: "later" }).pipe(Stream.runDrain)
      }).pipe(
        OpenAiClient.withWebSocketMode,
        Effect.provide(OpenAiLanguageModel.model("gpt-4o-mini")),
        Effect.provide(OpenAiClient.layer({ apiKey: Redacted.make("sk-test") })),
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url)),
        Effect.provideService(HttpClient.HttpClient, HttpClient.make(() => Effect.die("unexpected http")))
      )

      const respond = Effect.gen(function*() {
        const first = yield* nextCreate(server)
        messages.push(first)
        assert.isUndefined(first.previous_response_id)
        assert.deepStrictEqual(first.input, [userInput("hello")])
        sendCompleted(server, "resp_1", "msg_1", "ok")

        const incremental = yield* nextCreate(server)
        messages.push(incremental)
        assert.strictEqual(incremental.previous_response_id, "resp_1")
        assert.deepStrictEqual(incremental.input, [userInput("again")])
        server.send(previousResponseNotFound)

        const retried = yield* nextCreate(server)
        messages.push(retried)
        assert.isUndefined(retried.previous_response_id)
        assert.deepStrictEqual(retried.input, [
          userInput("hello"),
          assistantInput("msg_1", "ok"),
          userInput("again")
        ])
        sendCompleted(server, "resp_2", "msg_2", "retried")

        const later = yield* nextCreate(server)
        messages.push(later)
        assert.strictEqual(later.previous_response_id, "resp_2")
        assert.deepStrictEqual(later.input, [userInput("later")])
        sendCompleted(server, "resp_3", "msg_3", "later")
      })

      yield* Effect.all([drive, respond], { concurrency: "unbounded" }).pipe(
        Effect.timeout("5 seconds")
      )
      assert.strictEqual(messages.length, 4)
    }))
})

const nextCreate = (server: WS) =>
  Effect.promise(() => server.nextMessage).pipe(
    Effect.map((message) => message as ResponseCreate)
  )

const sendCompleted = (server: WS, id: string, itemId: string, text: string) => {
  for (const event of completedTurn(id, itemId, text)) {
    server.send(event)
  }
}
