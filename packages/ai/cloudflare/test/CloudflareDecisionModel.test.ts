import { CloudflareClient, CloudflareDecisionModel } from "@effect/ai-cloudflare"
import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Duration, Effect, Layer, Redacted, Schema } from "effect"
import { Decision, DecisionModel, Model } from "effect/ai"
import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"

const Triage = Decision.make({
  input: Schema.Struct({ message: Schema.String }),
  decisions: {
    team: Decision.classify({
      instructions: "Which team should handle this request?",
      criteria: { billing: "Payments", technical: "Outages" }
    }),
    severity: Decision.rate({
      instructions: "How severe is the impact?",
      criteria: ["Minor", "Major", "Critical"]
    }),
    urgent: Decision.probability({
      instructions: "Does this need immediate attention?",
      criteria: { false: "Can wait", true: "Act now" }
    })
  }
})

const input = { message: "Checkout is down" }
const result = {
  model: "clef",
  answers: {
    team: {
      type: "choice",
      choice: "technical",
      confidence: 0.9,
      probabilities: { billing: 0.1, technical: 0.9 }
    },
    severity: {
      type: "score",
      score: 1.75,
      confidence: 0.8,
      probabilities: { "0": 0.05, "1": 0.15, "2": 0.8 },
      legend: { "0": "Minor", "1": "Major", "2": "Critical" }
    },
    urgent: { type: "noul", noul: 0.99 }
  },
  usage: { input_tokens: 120, output_tokens: 0 }
}

const options = { accountId: "test-account", apiKey: Redacted.make("test-token") }

const httpLayer = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.makeWith(
      Effect.flatMap(handler),
      Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
    )
  )

const response = (request: HttpClientRequest.HttpClientRequest, body: unknown, init?: ResponseInit) =>
  Effect.succeed(HttpClientResponse.fromWeb(request, Response.json(body, init)))

const modelLayer = (
  body: unknown,
  init?: ResponseInit
) =>
  CloudflareDecisionModel.layer({ model: "clef" }).pipe(
    Layer.provide(CloudflareClient.layer(options)),
    Layer.provide(httpLayer((request) => response(request, body, init)))
  )

describe("CloudflareDecisionModel", () => {
  for (const model of ["clef", "clef-flash"] as const) {
    it.effect(`sends and decodes all decision types with ${model}`, () =>
      Effect.gen(function*() {
        const { answers, usage } = yield* DecisionModel.decide(Triage, { input })
        assert.strictEqual(yield* Model.ProviderName, "cloudflare")
        assert.strictEqual(yield* Model.ModelName, model)
        assert.strictEqual(answers.team.label, "technical")
        assert.deepStrictEqual({ ...answers.team.probabilities }, { billing: 0.1, technical: 0.9 })
        assert.strictEqual(answers.team.confidence, 0.9)
        assert.strictEqual(answers.severity.label, "Critical")
        assert.strictEqual(answers.severity.rating, 1.75)
        assert.deepStrictEqual({ ...answers.severity.probabilities }, { Minor: 0.05, Major: 0.15, Critical: 0.8 })
        assert.strictEqual(answers.urgent.probability, 0.99)
        assert.strictEqual(usage.inputTokens, 120)
        assert.strictEqual(usage.outputTokens, 0)
      }).pipe(
        Effect.provide(CloudflareDecisionModel.model(model)),
        Effect.provide(CloudflareClient.layer(options)),
        Effect.provide(httpLayer((request) => {
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(
            request.url,
            `https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/cloudflare/${model}`
          )
          assert.strictEqual(request.headers.authorization, "Bearer test-token")
          assert.strictEqual(request.headers["content-type"], "application/json")
          assert.strictEqual(request.body._tag, "Uint8Array")
          if (request.body._tag === "Uint8Array") {
            assert.deepStrictEqual(JSON.parse(new TextDecoder().decode(request.body.body)), {
              model,
              state: input,
              questions: {
                team: {
                  type: "choice",
                  instructions: Triage.decisions.team.instructions,
                  criteria: Triage.decisions.team.criteria
                },
                severity: {
                  type: "score",
                  instructions: Triage.decisions.severity.instructions,
                  criteria: Triage.decisions.severity.criteria
                },
                urgent: {
                  type: "noul",
                  instructions: Triage.decisions.urgent.instructions,
                  criteria: Triage.decisions.urgent.criteria
                }
              }
            })
          }
          return response(request, { success: true, result: { ...result, model }, errors: [], messages: [] })
        }))
      ))
  }

  it.effect("accepts four-decimal rounding drift and derives rating labels", () =>
    Effect.gen(function*() {
      const { answers } = yield* DecisionModel.decide(Triage, { input })
      assert.strictEqual(answers.severity.label, "Minor")
      assert.closeTo(answers.severity.probabilities.Minor, 1 / 3, 1e-10)
    }).pipe(Effect.provide(modelLayer({
      success: true,
      result: {
        ...result,
        answers: {
          ...result.answers,
          severity: {
            ...result.answers.severity,
            score: 1,
            confidence: 0.3333,
            probabilities: { "0": 0.3333, "1": 0.3333, "2": 0.3333 }
          }
        }
      }
    }))))

  for (
    const [name, answers] of [
      ["missing answers", { team: result.answers.team }],
      ["mismatched answer types", { ...result.answers, team: result.answers.urgent }],
      ["missing rating levels", {
        ...result.answers,
        severity: { ...result.answers.severity, probabilities: { "0": 0.2, "1": 0.8 } }
      }],
      ["excessive rounding drift", {
        ...result.answers,
        team: { ...result.answers.team, probabilities: { billing: 0.1, technical: 0.89 } }
      }]
    ] as const
  ) {
    it.effect(`rejects ${name}`, () =>
      Effect.gen(function*() {
        const error = yield* DecisionModel.decide(Triage, { input }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }).pipe(Effect.provide(modelLayer({ success: true, result: { ...result, answers } }))))
  }

  it.effect("loads client configuration and sends string state", () => {
    const definition = Decision.make({ input: Schema.String, decisions: { urgent: Triage.decisions.urgent } })
    return DecisionModel.decide(definition, { input: "Outage" }).pipe(
      Effect.provide(CloudflareDecisionModel.layer({ model: "clef" })),
      Effect.provide(CloudflareClient.layerConfig({
        apiUrl: Config.String("TEST_API_URL"),
        transformClient: (client) =>
          client.pipe(HttpClient.mapRequest(HttpClientRequest.setHeader("x-test", "configured")))
      })),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({
        env: {
          CLOUDFLARE_ACCOUNT_ID: "configured-account",
          CLOUDFLARE_API_TOKEN: "configured-token",
          TEST_API_URL: "https://example.com/api"
        }
      }))),
      Effect.provide(httpLayer((request) => {
        assert.strictEqual(
          request.url,
          "https://example.com/api/accounts/configured-account/ai/run/@cf/cloudflare/clef"
        )
        assert.strictEqual(request.headers["x-test"], "configured")
        assert.strictEqual(request.headers.authorization, "Bearer configured-token")
        if (request.body._tag === "Uint8Array") {
          assert.strictEqual(JSON.parse(new TextDecoder().decode(request.body.body)).state, "Outage")
        }
        return response(request, { success: true, result })
      }))
    )
  })

  for (
    const [status, tag] of [
      [400, "InvalidRequestError"],
      [401, "AuthenticationError"],
      [403, "AuthenticationError"],
      [404, "InvalidRequestError"],
      [422, "InvalidRequestError"],
      [429, "RateLimitError"],
      [503, "InternalProviderError"],
      [200, "InternalProviderError"]
    ] as const
  ) {
    it.effect(`maps Cloudflare failure envelopes with HTTP ${status}`, () =>
      Effect.gen(function*() {
        const error = yield* DecisionModel.decide(Triage, { input }).pipe(Effect.flip)
        assert.strictEqual(error.module, "CloudflareClient")
        assert.strictEqual(error.method, "createDecisions")
        assert.strictEqual(error.reason._tag, tag)
        if (error.reason._tag === "RateLimitError") {
          assert.strictEqual(Duration.toMillis(error.reason.retryAfter!), 2000)
          assert.deepStrictEqual(error.reason.metadata, {
            cloudflare: { rayId: "test-ray", errors: [{ code: 3040, message: "Request failed" }] }
          })
        }
        if ("http" in error.reason) {
          assert.strictEqual(error.reason.http?.response?.status, status)
          assert.notInclude(JSON.stringify(error.reason.http?.request), "test-token")
          assert.include(error.reason.http?.body ?? "", "Request failed")
        }
        if ("description" in error.reason) {
          assert.include(error.reason.description ?? "", "Request failed")
          assert.include(error.reason.description ?? "", "3040")
          assert.include(error.reason.description ?? "", "test-ray")
        }
      }).pipe(Effect.provide(modelLayer(
        { success: false, result: null, errors: [{ code: 3040, message: "Request failed" }] },
        { status, headers: { "cf-ray": "test-ray", "retry-after": "2" } }
      ))))
  }

  for (
    const [name, body] of [
      ["missing envelope", result],
      ["null result", { success: true, result: null }],
      ["missing usage", { success: true, result: { model: "clef", answers: result.answers } }],
      ["malformed answer", { success: true, result: { ...result, answers: { urgent: { type: "noul" } } } }]
    ] as const
  ) {
    it.effect(`rejects a ${name}`, () =>
      Effect.gen(function*() {
        const error = yield* DecisionModel.decide(Triage, { input }).pipe(Effect.flip)
        assert.strictEqual(error.module, "CloudflareClient")
        assert.strictEqual(error.reason._tag, "InvalidOutputError")
      }).pipe(Effect.provide(modelLayer(body))))
  }

  it.effect("maps non-JSON gateway failures by HTTP status", () =>
    Effect.gen(function*() {
      const error = yield* DecisionModel.decide(Triage, { input }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "InternalProviderError")
      if (error.reason._tag === "InternalProviderError") {
        assert.include(error.reason.description, "Bad gateway")
      }
    }).pipe(
      Effect.provide(CloudflareDecisionModel.layer({ model: "clef" })),
      Effect.provide(CloudflareClient.layer(options)),
      Effect.provide(httpLayer((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response("Bad gateway", { status: 502 })))
      ))
    ))

  it.effect("maps transport failures to NetworkError", () =>
    Effect.gen(function*() {
      const error = yield* DecisionModel.decide(Triage, { input }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "NetworkError")
    }).pipe(
      Effect.provide(CloudflareDecisionModel.layer({ model: "clef" })),
      Effect.provide(CloudflareClient.layer(options)),
      Effect.provide(httpLayer((request) =>
        Effect.fail(
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause: new Error("Connection refused") })
          })
        )
      ))
    ))
})
