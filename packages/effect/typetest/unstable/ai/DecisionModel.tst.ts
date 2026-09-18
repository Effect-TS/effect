import { Context, Effect, Schema, SchemaGetter } from "effect"
import { type AiError, Decision, DecisionModel } from "effect/unstable/ai"
import { describe, expect, it } from "tstyche"

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

const RedactedTriage = Decision.make({
  input: Schema.Struct({ body: RedactedString }),
  decisions: {
    urgent: Decision.probability({
      instructions: "Needs action now",
      criteria: { false: "No", true: "Yes" }
    })
  }
})

const program = DecisionModel.decide(TicketTriage, {
  input: { subject: "Card was charged twice", priority: 3 }
})

type Success = typeof program extends Effect.Effect<infer A, any, any> ? A : never
type Answers = Success["answers"]

describe("Decision", () => {
  it("classify infers labels from the criteria keys", () => {
    expect<Answers["department"]["label"]>().type.toBe<"billing" | "technical" | "sales">()
    expect<Answers["department"]["probabilities"]>().type.toBe<{
      readonly billing: number
      readonly technical: number
      readonly sales: number
    }>()
    expect<Answers["department"]["confidence"]>().type.toBe<number>()
  })

  it("rate infers labels from the ordered criteria", () => {
    expect<Answers["frustration"]["rating"]>().type.toBe<number>()
    expect<Answers["frustration"]["label"]>().type.toBe<"calm" | "frustrated" | "angry">()
    expect<Answers["frustration"]["probabilities"]>().type.toBe<{
      readonly calm: number
      readonly frustrated: number
      readonly angry: number
    }>()
    expect<Answers["frustration"]["confidence"]>().type.toBe<number>()
  })

  it("rate widens to string for non-literal criteria", () => {
    const levels: ReadonlyArray<string> = ["low", "high"]
    const Wide = Decision.make({
      input: Schema.String,
      decisions: {
        level: Decision.rate({ instructions: "How much", criteria: levels })
      }
    })
    const wide = DecisionModel.decide(Wide, { input: "text" })

    type WideSuccess = typeof wide extends Effect.Effect<infer A, any, any> ? A : never
    type WideAnswers = WideSuccess["answers"]

    expect<WideAnswers["level"]["label"]>().type.toBe<string>()
  })

  it("probability answers carry only the probability", () => {
    expect<Answers["urgent"]>().type.toBe<{ readonly probability: number }>()
    expect<Answers["urgent"]>().type.not.toHaveProperty("confidence")
    expect<Answers["urgent"]>().type.not.toHaveProperty("probabilities")
  })

  it("probability requires both false and true criteria", () => {
    expect(Decision.probability({
      instructions: "Needs action now",
      criteria: { false: "No" }
    })).type.toRaiseError()
    expect(Decision.probability({
      instructions: "Needs action now",
      criteria: { true: "Yes" }
    })).type.toRaiseError()
  })

  it("instructions must be a string", () => {
    expect(Decision.classify({
      instructions: ["Which team"],
      criteria: { billing: "payments" }
    })).type.toRaiseError()
  })

  it("make rejects a non-schema input", () => {
    expect(Decision.make({
      input: "Ticket",
      decisions: {
        urgent: Decision.probability({
          instructions: "Needs action now",
          criteria: { false: "No", true: "Yes" }
        })
      }
    })).type.toRaiseError()
  })
})

describe("DecisionModel", () => {
  it("decide keys answers by the decisions map", () => {
    expect<keyof Answers>().type.toBe<"department" | "frustration" | "urgent">()
    expect<Success["usage"]>().type.toBe<DecisionModel.DecisionUsage>()
  })

  it("decide fails only with AiError", () => {
    type Error = typeof program extends Effect.Effect<any, infer E, any> ? E : never

    expect<Error>().type.toBe<AiError.AiError>()
  })

  it("decide requires the DecisionModel service", () => {
    type Requirements = typeof program extends Effect.Effect<any, any, infer R> ? R : never

    expect<Requirements>().type.toBe<DecisionModel.DecisionModel>()
  })

  it("decide includes input encoding services in the requirements", () => {
    const redacted = DecisionModel.decide(RedactedTriage, { input: { body: "call me" } })

    type Requirements = typeof redacted extends Effect.Effect<any, any, infer R> ? R : never

    expect<Requirements>().type.toBe<DecisionModel.DecisionModel | Redactor>()
  })

  it("decide takes the schema Type as input", () => {
    expect(DecisionModel.decide(TicketTriage, {
      input: { subject: "Card was charged twice", priority: "3" }
    })).type.toRaiseError()
    expect(DecisionModel.decide(TicketTriage, {
      input: { subject: "Card was charged twice" }
    })).type.toRaiseError()
  })

  it("the service decide matches the module decide without the service requirement", () => {
    const model = null as unknown as DecisionModel.DecisionModel
    const viaService = model.decide(TicketTriage, {
      input: { subject: "Card was charged twice", priority: 3 }
    })
    const viaServiceRedacted = model.decide(RedactedTriage, { input: { body: "call me" } })

    type ServiceSuccess = typeof viaService extends Effect.Effect<infer A, any, any> ? A : never
    type ServiceError = typeof viaService extends Effect.Effect<any, infer E, any> ? E : never
    type ServiceRequirements = typeof viaService extends Effect.Effect<any, any, infer R> ? R : never
    type RedactedRequirements = typeof viaServiceRedacted extends Effect.Effect<any, any, infer R> ? R : never

    expect<ServiceSuccess>().type.toBe<Success>()
    expect<ServiceError>().type.toBe<AiError.AiError>()
    expect<ServiceRequirements>().type.toBe<never>()
    expect<RedactedRequirements>().type.toBe<Redactor>()
  })

  it("make takes a provider decide returning AiError", () => {
    const provider = (options: DecisionModel.ProviderOptions) => {
      expect(options.state).type.toBe<unknown>()
      expect(options.decisions).type.toBeAssignableTo<Record<string, Decision.Any>>()
      return Effect.succeed<DecisionModel.ProviderResponse>({
        answers: {},
        usage: { inputTokens: undefined, outputTokens: undefined }
      })
    }

    expect(DecisionModel.make({ decide: provider })).type.toBe<Effect.Effect<DecisionModel.DecisionModel>>()
  })
})
