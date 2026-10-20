/**
 * @title Making typed decisions with DecisionModel
 *
 * Define classification, rating, and probability decisions over a `Schema`
 * input with `Decision.make`, then answer them in one provider call with
 * `DecisionModel.decide` or `DecisionModel.decideSettled`.
 */
import { CloudflareClient, CloudflareDecisionModel } from "@effect/ai-cloudflare"
import { Context, Effect, Layer, Result, Schema } from "effect"
import { AiError, Decision, DecisionModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"
import {
  type Priority,
  type Queue,
  type Screenshot,
  SupportTicket,
  TicketRouting
} from "./fixtures/domain/SupportTicket.ts"

// ---------------------------------------------------------------------------
// 1. Defining decisions
// ---------------------------------------------------------------------------

// A decision definition pairs an input schema with named decisions. Every
// decision in a definition is answered together in a single provider call, so
// group the questions you ask about the same input.
//
// Unlike `LanguageModel.generateObject`, a `DecisionModel` does not generate
// free text. It returns probabilities over the options you define, which lets
// your code set its own thresholds instead of trusting a single label.
const TicketTriage = Decision.make({
  // The input is encoded with `Schema.toCodecJson` before it is sent, so any
  // JSON-encodable schema works, including classes and branded types.
  input: SupportTicket,
  decisions: {
    // `classify` picks one label out of an unordered set. Each label maps to a
    // description the model uses to tell the options apart. Use `null` for a
    // label that needs no explanation.
    department: Decision.classify({
      instructions: "Which team should handle this ticket",
      criteria: {
        billing: "Charges, invoices, refunds, plan changes",
        technical: "Bugs, errors, outages, integration problems",
        account: "Login, SSO, permissions, deleting or transferring accounts"
      }
    }),
    // `rate` places the input on an ordered scale, lowest first. Descriptions
    // can be strings or structured JSON. Answers use the labels, and
    // `rating` is the probability-weighted position on the scale.
    severity: Decision.rate({
      instructions: "How badly is the customer affected?",
      criteria: [
        "cosmetic",
        {
          label: "degraded",
          description: {
            what: "A feature is broken or slow, but a workaround exists",
            examples: ["export fails in Safari but works in Chrome"]
          }
        },
        {
          label: "blocking",
          description: {
            what: "The customer cannot do their work and has no workaround",
            examples: ["cannot log in", "every API request returns 500", "data loss"]
          }
        }
      ]
    }),
    // `probability` estimates how likely a statement about the input is to be
    // true. Optional criteria describe both outcomes.
    wantsRefund: Decision.probability({
      instructions: "The customer is asking for money back",
      criteria: {
        false: "No refund or credit is requested",
        true: "The customer asks for a refund, credit, or chargeback reversal"
      }
    }),
    churnRisk: Decision.probability({
      instructions: "The customer says or implies they may cancel or switch providers"
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Wrapping decisions in a service
// ---------------------------------------------------------------------------

export class TicketTriageError extends Schema.TaggedError<TicketTriageError>()("TicketTriageError", {
  reason: AiError.AiErrorReason
}) {
  static fromAiError(error: AiError.AiError) {
    return new TicketTriageError({ reason: error.reason })
  }
}

// Thresholds belong to your application, not the model. Tune them against
// labelled tickets and keep them next to the code that uses them.
const departmentThreshold = 0.7
const refundThreshold = 0.6
const churnThreshold = 0.5

export class TicketTriager extends Context.Service<TicketTriager, {
  // Route a ticket, falling back to safe defaults for any decision the model
  // could not answer.
  route(ticket: SupportTicket, screenshots?: ReadonlyArray<Screenshot>): Effect.Effect<
    TicketRouting,
    TicketTriageError
  >
  // A yes/no check where only a real answer is useful.
  isOutage(ticket: SupportTicket): Effect.Effect<boolean, TicketTriageError>
}>()("acme/TicketTriager") {
  static readonly layer = Layer.effect(
    TicketTriager,
    Effect.gen(function*() {
      // `CloudflareDecisionModel.model` returns a `Model` for Cloudflare's Clef
      // decision models. Other providers implement the same `DecisionModel`
      // service, e.g. `TypeSafeDecisionModel.model("jev-latest")` from
      // `@effect/ai-typesafe` or `OpenRouterDecisionModel` from
      // `@effect/ai-openrouter`, so this service code does not change when you
      // switch.
      //
      // `captureRequirements` moves the `CloudflareClient` requirement into
      // this Layer's requirements.
      const clef = yield* CloudflareDecisionModel.model("clef").captureRequirements

      const route = Effect.fn("TicketTriager.route")(
        function*(ticket: SupportTicket, screenshots: ReadonlyArray<Screenshot> = []) {
          // `decideSettled` returns one `Result` per decision instead of
          // failing the whole call when one answer is missing, refused, or
          // invalid. Use it when a partial answer is still useful. Network and
          // provider errors still fail the effect.
          const { outcomes, usage } = yield* DecisionModel.decideSettled(TicketTriage, {
            input: ticket,
            // Images are sent alongside the encoded input. Clef accepts bytes,
            // base64 strings, or `data:` URLs; remote URLs fail with
            // `InvalidUserInputError` because Clef does not fetch them.
            images: screenshots.map((shot) => ({ mediaType: shot.mediaType, data: shot.bytes }))
          })
          yield* Effect.logDebug(`triage tokens in=${usage.inputTokens} out=${usage.outputTokens}`)

          // `label` is the provider's pick, but `probabilities` holds the whole
          // distribution. Only auto-route when the chosen department is
          // clearly ahead; send everything else, including an unanswered
          // decision, to a person.
          let queue: Queue = "manual-review"
          if (Result.isSuccess(outcomes.department)) {
            const { label, probabilities } = outcomes.department.success
            if (probabilities[label] >= departmentThreshold) queue = label
          }

          // For ratings, `label` is the most likely level and `rating` is a
          // number in `[0, levels - 1]` that can fall between levels, which is
          // handy for sorting. If severity is unanswered, assume the ticket
          // matters rather than silently deprioritising it.
          let priority: Priority = "high"
          if (Result.isSuccess(outcomes.severity)) {
            const { label, rating } = outcomes.severity.success
            priority = label === "blocking"
              ? ticket.plan === "enterprise" ? "page-on-call" : "high"
              : rating >= 0.5
              ? "normal"
              : "low"
          }

          // Unanswered probabilities fall back to `false`: these flags only
          // add work for an agent, so missing one is the cheaper mistake.
          const probabilityOf = (outcome: typeof outcomes.wantsRefund) =>
            Result.isSuccess(outcome) ? outcome.success.probability : 0

          return new TicketRouting({
            ticketId: ticket.id,
            queue,
            priority,
            offerRefund: probabilityOf(outcomes.wantsRefund) >= refundThreshold,
            flagChurnRisk: probabilityOf(outcomes.churnRisk) >= churnThreshold
          })
        },
        Effect.provide(clef),
        Effect.mapError(TicketTriageError.fromAiError)
      )

      // A definition can be as small as one decision. Defining it once at
      // service construction keeps it out of the hot path.
      const OutageCheck = Decision.make({
        input: SupportTicket,
        decisions: {
          outage: Decision.probability({
            instructions: "The ticket reports a service-wide outage rather than a problem for one customer"
          })
        }
      })

      const isOutage = Effect.fn("TicketTriager.isOutage")(
        function*(ticket: SupportTicket) {
          // `decide` requires every decision to be answered. A refusal fails
          // with `AiError` reason `ContentPolicyError`, and a missing or
          // invalid answer fails with `InvalidOutputError`.
          const { answers } = yield* DecisionModel.decide(OutageCheck, { input: ticket })
          return answers.outage.probability >= 0.8
        },
        Effect.provide(clef),
        Effect.mapError(TicketTriageError.fromAiError)
      )

      return TicketTriager.of({ route, isOutage })
    })
  ).pipe(
    // `CloudflareClient.layerConfig` reads `CLOUDFLARE_ACCOUNT_ID`,
    // `CLOUDFLARE_API_TOKEN`, and the optional `CLOUDFLARE_AI_GATEWAY_ID`.
    Layer.provide(CloudflareClient.layerConfig()),
    Layer.provide(FetchHttpClient.layer)
  )
}
