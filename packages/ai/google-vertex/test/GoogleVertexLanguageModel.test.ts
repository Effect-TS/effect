import { GoogleVertexClient, GoogleVertexLanguageModel, GoogleVertexTool } from "@effect/ai-google-vertex"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema, Stream } from "effect"
import { LanguageModel, Tool, Toolkit } from "effect/unstable/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("GoogleVertexLanguageModel", () => {
  describe("generateText", () => {
    it.effect("decodes text content", () =>
      Effect.gen(function*() {
        const layer = clientLayer((request) =>
          Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "Hello world" }] },
                  finishReason: "STOP"
                }
              ],
              usageMetadata: {
                promptTokenCount: 5,
                candidatesTokenCount: 3,
                totalTokenCount: 8
              },
              modelVersion: "gemini-2.5-flash",
              responseId: "resp_1"
            })
          )
        )

        const response = yield* LanguageModel.generateText({
          prompt: "Say hello"
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        assert.strictEqual(response.text, "Hello world")
        assert.strictEqual(response.finishReason, "stop")
        assert.strictEqual(response.usage.inputTokens.total, 5)
        assert.strictEqual(response.usage.outputTokens.total, 3)
      }))

    it.effect("decodes function call params", () =>
      Effect.gen(function*() {
        const toolParams = { pattern: "*.ts" }
        const layer = clientLayer((request) =>
          Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [
                      { functionCall: { name: "GlobTool", args: toolParams } }
                    ]
                  },
                  finishReason: "STOP"
                }
              ],
              usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 }
            })
          )
        )

        const GlobTool = Tool.make("GlobTool", {
          description: "Search for files",
          parameters: Schema.Struct({ pattern: Schema.String }),
          success: Schema.String
        })

        const toolkit = Toolkit.make(GlobTool)

        const response = yield* LanguageModel.generateText({
          prompt: "find ts files",
          toolkit,
          disableToolCallResolution: true
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        const toolCall = response.content.find(
          (part) => part.type === "tool-call"
        )
        assert.isDefined(toolCall)
        if (toolCall?.type !== "tool-call") return
        assert.strictEqual(toolCall.name, "GlobTool")
        assert.deepStrictEqual(toolCall.params, toolParams)
      }))

    it.effect("builds a generateContent request body", () =>
      Effect.gen(function*() {
        let capturedRequest: HttpClientRequest.HttpClientRequest | undefined = undefined
        const layer = clientLayer((request) => {
          capturedRequest = request
          return Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "ok" }] },
                  finishReason: "STOP"
                }
              ]
            })
          )
        })

        yield* LanguageModel.generateText({ prompt: "hi" }).pipe(
          Effect.provide(
            GoogleVertexLanguageModel.model("gemini-2.5-flash", {
              temperature: 0.5,
              maxOutputTokens: 100
            })
          ),
          Effect.provide(layer)
        )

        assert.isDefined(capturedRequest)
        const captured = capturedRequest as HttpClientRequest.HttpClientRequest
        assert.isTrue(
          captured.url.endsWith("/models/gemini-2.5-flash:generateContent")
        )
        const body = yield* getRequestBody(captured)
        assert.deepStrictEqual(body.contents, [
          { role: "user", parts: [{ text: "hi" }] }
        ])
        assert.strictEqual(body.generationConfig.temperature, 0.5)
        assert.strictEqual(body.generationConfig.maxOutputTokens, 100)
      }))

    it.effect("sends function declaration schemas for tools", () =>
      Effect.gen(function*() {
        let capturedRequest: HttpClientRequest.HttpClientRequest | undefined = undefined
        const layer = clientLayer((request) => {
          capturedRequest = request
          return Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "ok" }] },
                  finishReason: "STOP"
                }
              ]
            })
          )
        })

        const GlobTool = Tool.make("GlobTool", {
          description: "Search for files",
          parameters: Schema.Struct({ pattern: Schema.String }),
          success: Schema.String
        })

        yield* LanguageModel.generateText({
          prompt: "find ts files",
          toolkit: Toolkit.make(GlobTool),
          disableToolCallResolution: true
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        assert.isDefined(capturedRequest)
        const body = yield* getRequestBody(
          capturedRequest as HttpClientRequest.HttpClientRequest
        )
        assert.deepStrictEqual(body.tools, [
          {
            functionDeclarations: [
              {
                name: "GlobTool",
                description: "Search for files",
                parametersJsonSchema: {
                  type: "object",
                  properties: { pattern: { type: "string" } },
                  required: ["pattern"],
                  additionalProperties: false
                }
              }
            ]
          }
        ])
      }))

    it.effect("preserves $ref/$defs in native JSON Schemas", () =>
      Effect.gen(function*() {
        let capturedRequest: HttpClientRequest.HttpClientRequest | undefined = undefined
        const layer = clientLayer((request) => {
          capturedRequest = request
          return Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "ok" }] },
                  finishReason: "STOP"
                }
              ]
            })
          )
        })

        // A reused, identified sub-schema verifies that the native JSON Schema
        // field preserves `$defs` + `$ref`.
        const Address = Schema.Struct({ city: Schema.String }).annotate({
          identifier: "Address"
        })
        const Contacts = Tool.make("save_contacts", {
          description: "Save contacts",
          parameters: Schema.Struct({ home: Address, work: Address }),
          success: Schema.String
        })

        yield* LanguageModel.generateText({
          prompt: "save my contacts",
          toolkit: Toolkit.make(Contacts),
          disableToolCallResolution: true
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        assert.isDefined(capturedRequest)
        const body = yield* getRequestBody(
          capturedRequest as HttpClientRequest.HttpClientRequest
        )
        const declaration = body.tools[0].functionDeclarations[0]
        assert.isUndefined(declaration.parameters)
        assert.strictEqual(
          declaration.parametersJsonSchema.properties.home.$ref,
          "#/$defs/Address"
        )
        assert.deepStrictEqual(
          declaration.parametersJsonSchema.properties.work,
          declaration.parametersJsonSchema.properties.home
        )
        assert.deepStrictEqual(
          declaration.parametersJsonSchema.$defs.Address,
          {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"],
            additionalProperties: false
          }
        )
      }))

    it.effect("does not send tools when toolChoice is none", () =>
      Effect.gen(function*() {
        let capturedRequest: HttpClientRequest.HttpClientRequest | undefined = undefined
        const layer = clientLayer((request) => {
          capturedRequest = request
          return Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "ok" }] },
                  finishReason: "STOP"
                }
              ]
            })
          )
        })

        yield* LanguageModel.generateText({
          prompt: "answer without tools",
          toolkit: Toolkit.make(GoogleVertexTool.GoogleSearch()),
          toolChoice: "none"
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        assert.isDefined(capturedRequest)
        const body = yield* getRequestBody(
          capturedRequest as HttpClientRequest.HttpClientRequest
        )
        assert.isUndefined(body.tools)
        assert.isUndefined(body.toolConfig)
      }))

    it.effect("maps provider-defined tool names to custom names", () =>
      Effect.gen(function*() {
        const layer = clientLayer((request) =>
          Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [
                      {
                        executableCode: {
                          language: "PYTHON",
                          code: "print(1)"
                        }
                      },
                      {
                        codeExecutionResult: {
                          outcome: "OUTCOME_OK",
                          output: "1"
                        }
                      }
                    ]
                  },
                  finishReason: "STOP"
                }
              ]
            })
          )
        )

        const response = yield* LanguageModel.generateText({
          prompt: "run code",
          toolkit: Toolkit.make(GoogleVertexTool.CodeExecution()),
          disableToolCallResolution: true
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        const toolCall = response.content.find((part) => part.type === "tool-call")
        const toolResult = response.content.find((part) => part.type === "tool-result")
        assert.isDefined(toolCall)
        assert.isDefined(toolResult)
        if (toolCall?.type !== "tool-call" || toolResult?.type !== "tool-result") {
          return
        }
        assert.strictEqual(toolCall.name, "CodeExecution")
        assert.strictEqual(toolResult.name, "CodeExecution")
        assert.isTrue(toolCall.providerExecuted)
        assert.isTrue(toolResult.providerExecuted)
      }))

    it.effect("preserves thought signatures on response text", () =>
      Effect.gen(function*() {
        const layer = clientLayer((request) =>
          Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [{ text: "answer", thoughtSignature: "signature-1" }]
                  },
                  finishReason: "STOP"
                }
              ]
            })
          )
        )

        const response = yield* LanguageModel.generateText({
          prompt: "answer"
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        const text = response.content.find((part) => part.type === "text")
        assert.isDefined(text)
        if (text?.type !== "text") return
        assert.deepStrictEqual(text.metadata.googleVertex, {
          thoughtSignature: "signature-1"
        })
      }))
  })

  describe("generateObject", () => {
    it.effect("sends a response schema for structured output", () =>
      Effect.gen(function*() {
        let capturedRequest: HttpClientRequest.HttpClientRequest | undefined = undefined
        const layer = clientLayer((request) => {
          capturedRequest = request
          return Effect.succeed(
            jsonResponse(request, {
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [
                      { text: JSON.stringify({ name: "John", city: "Rome" }) }
                    ]
                  },
                  finishReason: "STOP"
                }
              ]
            })
          )
        })

        yield* LanguageModel.generateObject({
          prompt: "Give me a person",
          schema: Schema.Struct({
            name: Schema.String,
            city: Schema.String
          })
        }).pipe(
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        assert.isDefined(capturedRequest)
        const body = yield* getRequestBody(
          capturedRequest as HttpClientRequest.HttpClientRequest
        )
        assert.strictEqual(
          body.generationConfig.responseMimeType,
          "application/json"
        )
        assert.isUndefined(body.generationConfig.responseSchema)
        assert.deepStrictEqual(body.generationConfig.responseJsonSchema, {
          type: "object",
          properties: {
            name: { type: "string" },
            city: { type: "string" }
          },
          required: ["name", "city"],
          additionalProperties: false
        })
      }))
  })

  describe("streamText", () => {
    it.effect("decodes streamed text deltas", () =>
      Effect.gen(function*() {
        const layer = clientLayer((request) =>
          Effect.succeed(
            sseResponse(request, [
              {
                candidates: [
                  { content: { role: "model", parts: [{ text: "Hello" }] } }
                ]
              },
              {
                candidates: [
                  { content: { role: "model", parts: [{ text: " world" }] } }
                ]
              },
              {
                candidates: [
                  {
                    content: { role: "model", parts: [] },
                    finishReason: "STOP"
                  }
                ],
                usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 }
              }
            ])
          )
        )

        const partsChunk = yield* LanguageModel.streamText({
          prompt: "Say hello"
        }).pipe(
          Stream.runCollect,
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        const parts = globalThis.Array.from(partsChunk)
        const text = parts
          .filter((part) => part.type === "text-delta")
          .map((part) => (part.type === "text-delta" ? part.delta : ""))
          .join("")
        assert.strictEqual(text, "Hello world")

        const finish = parts.find((part) => part.type === "finish")
        assert.isDefined(finish)
        if (finish?.type !== "finish") return
        assert.strictEqual(finish.reason, "stop")
      }))

    it.effect("preserves thought signatures on streamed parts", () =>
      Effect.gen(function*() {
        const layer = clientLayer((request) =>
          Effect.succeed(
            sseResponse(request, [
              {
                candidates: [
                  {
                    content: {
                      role: "model",
                      parts: [
                        {
                          text: "thinking",
                          thought: true,
                          thoughtSignature: "reasoning-signature"
                        }
                      ]
                    }
                  }
                ]
              },
              {
                candidates: [
                  {
                    content: {
                      role: "model",
                      parts: [
                        {
                          text: "answer",
                          thoughtSignature: "text-signature"
                        }
                      ]
                    },
                    finishReason: "STOP"
                  }
                ]
              }
            ])
          )
        )

        const partsChunk = yield* LanguageModel.streamText({
          prompt: "answer"
        }).pipe(
          Stream.runCollect,
          Effect.provide(GoogleVertexLanguageModel.model("gemini-2.5-flash")),
          Effect.provide(layer)
        )

        const parts = globalThis.Array.from(partsChunk)
        const reasoningDelta = parts.find((part) => part.type === "reasoning-delta")
        const textDelta = parts.find((part) => part.type === "text-delta")
        assert.isDefined(reasoningDelta)
        assert.isDefined(textDelta)
        if (
          reasoningDelta?.type !== "reasoning-delta" ||
          textDelta?.type !== "text-delta"
        ) {
          return
        }
        assert.deepStrictEqual(reasoningDelta.metadata.googleVertex, {
          thoughtSignature: "reasoning-signature"
        })
        assert.deepStrictEqual(textDelta.metadata.googleVertex, {
          thoughtSignature: "text-signature"
        })
      }))
  })
})

const clientLayer = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >
) =>
  GoogleVertexClient.layer({ apiKey: Redacted.make("sk-test-key") }).pipe(
    Layer.provide(
      Layer.succeed(HttpClient.HttpClient, makeHttpClient(handler))
    )
  )

const makeHttpClient = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >
) =>
  HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      return yield* handler(request)
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<
      HttpClientError.HttpClientError,
      never
    >
  )

const toSseBody = (events: ReadonlyArray<unknown>): string =>
  events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")

const sseResponse = (
  request: HttpClientRequest.HttpClientRequest,
  events: ReadonlyArray<unknown>
): HttpClientResponse.HttpClientResponse =>
  HttpClientResponse.fromWeb(
    request,
    new Response(toSseBody(events), {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    })
  )

const jsonResponse = (
  request: HttpClientRequest.HttpClientRequest,
  body: unknown
): HttpClientResponse.HttpClientResponse =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  )

const getRequestBody = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function*() {
    const body = request.body
    if (body._tag !== "Uint8Array") {
      return yield* Effect.die(new Error("Expected Uint8Array body"))
    }
    return JSON.parse(new TextDecoder().decode(body.body))
  })
