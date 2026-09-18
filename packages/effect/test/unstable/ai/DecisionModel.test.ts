import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema, SchemaGetter } from "effect"
import { Decision, DecisionModel, Model } from "effect/unstable/ai"
import * as AiError from "effect/unstable/ai/AiError"

const Ticket = Schema.Struct({
  subject: Schema.String,
  priority: Schema.FiniteFromString
})

const TicketTriage = Decision.make({
  input: Ticket,
  decisions: {
    department: Decision.classify({
      instructions: "Which team should handle this",
      criteria: {
        billing: "payments",
        technical: "bugs",
        sales: "pricing"
      }
    }),
    frustration: Decision.rate({
      instructions: "How frustrated",
      criteria: ["calm", "frustrated", "angry"]
    }),
    urgent: Decision.probability({
      instructions: "The message is time-sensitive",
      criteria: {
        false: "No time pressure",
        true: "Needs action now"
      }
    })
  }
})

const ticket = { subject: "Card was charged twice", priority: 3 }

const triageAnswers = {
  department: {
    label: "billing",
    probabilities: { billing: 0.8, technical: 0.15, sales: 0.05 },
    confidence: 0.8
  },
  frustration: {
    rating: 1.4,
    label: "frustrated",
    probabilities: { calm: 0.1, frustrated: 0.5, angry: 0.4 },
    confidence: 0.5
  },
  urgent: {
    probability: 0.9
  }
}

const makeLayer = (
  decide: (
    options: DecisionModel.ProviderOptions
  ) => Effect.Effect<DecisionModel.ProviderResponse, AiError.AiError>
) =>
  Layer.effect(
    DecisionModel.DecisionModel,
    DecisionModel.make({ decide })
  )

const succeedWith = (
  answers: DecisionModel.ProviderResponse["answers"],
  usage: DecisionModel.ProviderResponse["usage"] = { inputTokens: undefined, outputTokens: undefined }
) => makeLayer(() => Effect.succeed({ answers, usage }))

const failureOf = <A, E>(effect: Effect.Effect<A, E, DecisionModel.DecisionModel>) =>
  effect.pipe(Effect.match({ onFailure: (error) => error, onSuccess: () => undefined }))

class Redactor extends Context.Service<Redactor, {
  readonly redact: (value: string) => string
}>()("Redactor") {}

const RedactedString = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    decode: SchemaGetter.passthrough(),
    encode: SchemaGetter.transformEffect<string, string, Redactor>((value) =>
      Effect.map(Effect.service(Redactor), (redactor) => redactor.redact(value))
    )
  })
)

describe("Decision", () => {
  it("make keeps the input schema and decisions", () => {
    assert.strictEqual(TicketTriage.input, Ticket)
    assert.deepStrictEqual(Object.keys(TicketTriage.decisions), ["department", "frustration", "urgent"])
    assert.strictEqual(TicketTriage.decisions.department._tag, "Classify")
    assert.strictEqual(TicketTriage.decisions.frustration._tag, "Rate")
    assert.strictEqual(TicketTriage.decisions.urgent._tag, "Probability")
  })

  it("constructors keep instructions and criteria", () => {
    assert.strictEqual(TicketTriage.decisions.department.instructions, "Which team should handle this")
    assert.deepStrictEqual(TicketTriage.decisions.department.criteria, {
      billing: "payments",
      technical: "bugs",
      sales: "pricing"
    })
    assert.deepStrictEqual(TicketTriage.decisions.frustration.criteria, ["calm", "frustrated", "angry"])
    assert.deepStrictEqual(TicketTriage.decisions.urgent.criteria, {
      false: "No time pressure",
      true: "Needs action now"
    })
  })

  it("make fails on empty decisions", () => {
    assert.throws(() => Decision.make({ input: Schema.String, decisions: {} }))
  })

  it("rate fails with fewer than two criteria", () => {
    assert.throws(() => Decision.rate({ instructions: "How much", criteria: ["only"] as any }))
  })
})

describe("DecisionModel", () => {
  it.effect("round trips usage with undefined tokens through JSON", () =>
    Effect.gen(function*() {
      const usage = new DecisionModel.DecisionUsage({ inputTokens: undefined, outputTokens: undefined })

      const encoded = yield* Schema.encodeEffect(DecisionModel.DecisionUsage)(usage)
      const json = JSON.parse(JSON.stringify(encoded))
      const decoded = yield* Schema.decodeUnknownEffect(DecisionModel.DecisionUsage)(json)

      assert.deepStrictEqual(json, {}, "encoded JSON")
      assert.deepStrictEqual(decoded, new DecisionModel.DecisionUsage({}), "decoded usage")
    }))

  it.effect("decide returns answers keyed by decision with usage", () =>
    Effect.gen(function*() {
      const { answers, usage } = yield* DecisionModel.decide(TicketTriage, { input: ticket })

      assert.deepStrictEqual(Object.keys(answers).sort(), ["department", "frustration", "urgent"])

      assert.strictEqual(answers.department.label, "billing")
      assert.deepStrictEqual(answers.department.probabilities, { billing: 0.8, technical: 0.15, sales: 0.05 })
      assert.strictEqual(answers.department.confidence, 0.8)

      assert.strictEqual(answers.frustration.rating, 1.4)
      assert.strictEqual(answers.frustration.label, "frustrated")
      assert.deepStrictEqual(answers.frustration.probabilities, { calm: 0.1, frustrated: 0.5, angry: 0.4 })
      assert.strictEqual(answers.frustration.confidence, 0.5)

      assert.strictEqual(answers.urgent.probability, 0.9)
      assert.isFalse("confidence" in answers.urgent)
      assert.isFalse("probabilities" in answers.urgent)

      assert.strictEqual(usage.inputTokens, 12)
      assert.strictEqual(usage.outputTokens, undefined)
    }).pipe(
      Effect.provide(succeedWith(triageAnswers, { inputTokens: 12, outputTokens: undefined }))
    ))

  it.effect("the service exposes the same decide operation", () =>
    Effect.gen(function*() {
      const model = yield* DecisionModel.DecisionModel
      const { answers } = yield* model.decide(TicketTriage, { input: ticket })

      assert.strictEqual(answers.department.label, "billing")
      assert.strictEqual(answers.urgent.probability, 0.9)
    }).pipe(
      Effect.provide(succeedWith(triageAnswers))
    ))

  it.effect("the provider receives the encoded input as state and every decision in one call", () => {
    const calls: Array<DecisionModel.ProviderOptions> = []

    return Effect.gen(function*() {
      yield* DecisionModel.decide(TicketTriage, { input: ticket })

      assert.strictEqual(calls.length, 1)
      assert.deepStrictEqual(calls[0].state, { subject: "Card was charged twice", priority: "3" })
      assert.strictEqual(calls[0].decisions, TicketTriage.decisions)
    }).pipe(
      Effect.provide(
        makeLayer((options) => {
          calls.push(options)
          return Effect.succeed({
            answers: triageAnswers,
            usage: { inputTokens: undefined, outputTokens: undefined }
          })
        })
      )
    )
  })

  it.effect("a string input is passed to the provider as a string state", () => {
    const states: Array<unknown> = []
    const Sentiment = Decision.make({
      input: Schema.String,
      decisions: {
        tone: Decision.classify({
          instructions: "Tone of the message",
          criteria: { positive: "happy", negative: "unhappy" }
        })
      }
    })

    return Effect.gen(function*() {
      const { answers } = yield* DecisionModel.decide(Sentiment, { input: "I love this" })

      assert.deepStrictEqual(states, ["I love this"])
      assert.strictEqual(answers.tone.label, "positive")
    }).pipe(
      Effect.provide(
        makeLayer(({ state }) => {
          states.push(state)
          return Effect.succeed({
            answers: {
              tone: { label: "positive", probabilities: { positive: 0.95, negative: 0.05 }, confidence: 0.95 }
            },
            usage: { inputTokens: undefined, outputTokens: undefined }
          })
        })
      )
    )
  })

  it.effect("input encoding services are resolved from the environment", () => {
    const states: Array<unknown> = []
    const Redacted = Decision.make({
      input: Schema.Struct({ body: RedactedString }),
      decisions: {
        urgent: Decision.probability({
          instructions: "Needs action now",
          criteria: { false: "No", true: "Yes" }
        })
      }
    })

    return Effect.gen(function*() {
      yield* DecisionModel.decide(Redacted, { input: { body: "call me at 555-0100" } })

      assert.deepStrictEqual(states, [{ body: "call me at [redacted]" }])
    }).pipe(
      Effect.provide(
        makeLayer(({ state }) => {
          states.push(state)
          return Effect.succeed({
            answers: { urgent: { probability: 0.5 } },
            usage: { inputTokens: undefined, outputTokens: undefined }
          })
        })
      ),
      Effect.provideService(Redactor, {
        redact: (value) => value.replace(/\d{3}-\d{4}/g, "[redacted]")
      })
    )
  })

  it.effect("input encoding failures surface as AiError", () => {
    let calls = 0
    const Strict = Decision.make({
      input: Schema.String.check(Schema.isMinLength(3)),
      decisions: {
        urgent: Decision.probability({
          instructions: "Needs action now",
          criteria: { false: "No", true: "Yes" }
        })
      }
    })

    return Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(Strict, { input: "hi" }))

      assert.strictEqual(calls, 0)
      assert.isTrue(AiError.isAiError(error))
      assert.strictEqual(error?.reason._tag, "InvalidUserInputError")
    }).pipe(
      Effect.provide(
        makeLayer(() => {
          calls++
          return Effect.die("provider should not be called")
        })
      )
    )
  })

  it.effect("provider AiError propagates through decide", () => {
    const error = AiError.make({
      module: "DecisionModelTest",
      method: "decide",
      reason: new AiError.UnknownError({ description: "boom" })
    })

    return Effect.gen(function*() {
      const result = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(result, error)
    }).pipe(
      Effect.provide(makeLayer(() => Effect.fail(error)))
    )
  })

  it.effect("decide fails with InvalidOutputError when an answer is missing", () =>
    Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(error?.reason._tag, "InvalidOutputError")
    }).pipe(
      Effect.provide(succeedWith({
        department: triageAnswers.department,
        frustration: triageAnswers.frustration
      }))
    ))

  it.effect("decide fails with InvalidOutputError when a classify label is not a criteria key", () =>
    Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(error?.reason._tag, "InvalidOutputError")
    }).pipe(
      Effect.provide(succeedWith({
        ...triageAnswers,
        department: { ...triageAnswers.department, label: "legal" }
      }))
    ))

  it.effect("decide fails with InvalidOutputError when a classify distribution is incomplete", () =>
    Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(error?.reason._tag, "InvalidOutputError")
    }).pipe(
      Effect.provide(succeedWith({
        ...triageAnswers,
        department: { ...triageAnswers.department, probabilities: { billing: 1 } }
      }))
    ))

  it.effect("decide fails with InvalidOutputError when a rate distribution is incomplete", () =>
    Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(error?.reason._tag, "InvalidOutputError")
    }).pipe(
      Effect.provide(succeedWith({
        ...triageAnswers,
        frustration: { ...triageAnswers.frustration, probabilities: { calm: 0.5, angry: 0.5 } }
      }))
    ))

  it.effect("decide fails with InvalidOutputError when a probability is outside [0, 1]", () =>
    Effect.gen(function*() {
      const error = yield* failureOf(DecisionModel.decide(TicketTriage, { input: ticket }))

      assert.strictEqual(error?.reason._tag, "InvalidOutputError")
    }).pipe(
      Effect.provide(succeedWith({
        ...triageAnswers,
        urgent: { probability: 1.5 }
      }))
    ))

  it.effect("Model.make wraps a DecisionModel layer with provider metadata", () =>
    Effect.gen(function*() {
      const provider = yield* Model.ProviderName
      const modelName = yield* Model.ModelName
      const { answers } = yield* DecisionModel.decide(TicketTriage, { input: ticket })

      assert.strictEqual(provider, "fake")
      assert.strictEqual(modelName, "fake-decisions")
      assert.strictEqual(answers.department.label, "billing")
    }).pipe(
      Effect.provide(Model.make("fake", "fake-decisions", succeedWith(triageAnswers)))
    ))
})
