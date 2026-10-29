import { Generated } from "@effect/ai-anthropic"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

const results = [
  {
    custom_id: "a",
    result: {
      type: "errored",
      error: { type: "error", error: { type: "api_error", message: "x" }, request_id: null }
    }
  },
  { custom_id: "b", result: { type: "canceled" } },
  { custom_id: "c", result: { type: "expired" } }
]

const jsonl = results.map((line) => JSON.stringify(line)).join("\n")

// Answers like the Message Batches results endpoint: 200 with a JSON Lines body.
const client = Generated.make(
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(
      request,
      new Response(jsonl, {
        status: 200,
        headers: { "content-type": "application/x-jsonl" }
      })
    ))
  ).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://api.anthropic.com")))
)

const decodeLine = Schema.decodeUnknownEffect(Schema.fromJsonString(Generated.MessageBatchIndividualResponse))
const decodeBetaLine = Schema.decodeUnknownEffect(Schema.fromJsonString(Generated.BetaMessageBatchIndividualResponse))

describe("Generated", () => {
  describe("message batch results", () => {
    it.effect("messageBatchesResults returns the JSON Lines body of a 200", () =>
      Effect.gen(function*() {
        const body = yield* client.messageBatchesResults("msgbatch_1", { params: {} })
        const lines = yield* Effect.forEach(new TextDecoder().decode(body).split("\n"), (line) => decodeLine(line))
        assert.deepStrictEqual(lines.map((line) => [line.custom_id, line.result.type]), [
          ["a", "errored"],
          ["b", "canceled"],
          ["c", "expired"]
        ])
      }))

    it.effect("messageBatchesResultsStream streams the JSON Lines body", () =>
      Effect.gen(function*() {
        const lines = yield* client.messageBatchesResultsStream("msgbatch_1", { params: {} }).pipe(
          Stream.decodeText(),
          Stream.splitLines,
          Stream.mapEffect((line) => decodeLine(line)),
          Stream.runCollect
        )
        assert.deepStrictEqual(lines.map((line) => line.custom_id), ["a", "b", "c"])
      }))

    it.effect("betaMessageBatchesResults returns the JSON Lines body of a 200", () =>
      Effect.gen(function*() {
        const body = yield* client.betaMessageBatchesResults("msgbatch_1", { params: {} })
        const lines = yield* Effect.forEach(new TextDecoder().decode(body).split("\n"), (line) => decodeBetaLine(line))
        assert.deepStrictEqual(lines.map((line) => line.result.type), ["errored", "canceled", "expired"])
      }))
  })
})
