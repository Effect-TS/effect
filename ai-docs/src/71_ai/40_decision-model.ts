/**
 * @title Use AI to make typed decisions with DecisionModel
 *
 * Define classification, rating, and probability decisions over a `Schema`
 * input with `Decision.make`, then answer them in one provider call with
 * `DecisionModel.decide`.
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
  // Route a new ticket to a queue and priority.
  route(ticket: SupportTicket, screenshots?: ReadonlyArray<Screenshot>): Effect.Effect<
    TicketRouting,
    TicketTriageError
  >
  // Re-sort a ticket in the backlog, where a partial answer beats none.
  backlogPriority(ticket: SupportTicket): Effect.Effect<Priority, TicketTriageError>
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

      const priorityOf = (ticket: SupportTicket, severity: { label: string; rating: number }): Priority =>
        severity.label === "blocking"
          ? ticket.plan === "enterprise" ? "page-on-call" : "high"
          : severity.rating >= 0.5
          ? "normal"
          : "low"

      const route = Effect.fn("TicketTriager.route")(
        function*(ticket: SupportTicket, screenshots: ReadonlyArray<Screenshot> = []) {
          // `decide` answers every decision in the definition in one call.
          // It requires all of them to be answered: a refusal fails with
          // `AiError` reason `ContentPolicyError`, and a missing or invalid
          // answer fails with `InvalidOutputError`.
          const { answers, usage } = yield* DecisionModel.decide(TicketTriage, {
            input: ticket,
            // Images are sent alongside the encoded input. Clef accepts bytes,
            // base64 strings, or `data:` URLs; remote URLs fail with
            // `InvalidUserInputError` because Clef does not fetch them.
            images: screenshots.map((shot) => ({ mediaType: shot.mediaType, data: shot.bytes }))
          })
          yield* Effect.logDebug(`triage tokens in=${usage.inputTokens} out=${usage.outputTokens}`)

          // `label` is the provider's pick, but `probabilities` holds the whole
          // distribution. Only auto-route when the chosen department is
          // clearly ahead, and send everything else to a person.
          const { label, probabilities } = answers.department
          const queue: Queue = probabilities[label] >= departmentThreshold ? label : "manual-review"

          // For ratings, `label` is the most likely level and `rating` is a
          // number in `[0, levels - 1]` that can fall between levels, which is
          // handy for sorting.
          const priority = priorityOf(ticket, answers.severity)

          // `probability` answers are a number in `[0, 1]`.
          return new TicketRouting({
            ticketId: ticket.id,
            queue,
            priority,
            offerRefund: answers.wantsRefund.probability >= refundThreshold,
            flagChurnRisk: answers.churnRisk.probability >= churnThreshold
          })
        },
        Effect.provide(clef),
        Effect.mapError(TicketTriageError.fromAiError)
      )

      const backlogPriority = Effect.fn("TicketTriager.backlogPriority")(
        function*(ticket: SupportTicket) {
          // `decideSettled` makes the same call but returns one `Result` per
          // decision instead of failing when one answer is missing, refused,
          // or invalid. Network and provider errors still fail the effect.
          const { outcomes } = yield* DecisionModel.decideSettled(TicketTriage, { input: ticket })
          // If severity is unanswered, assume the ticket matters rather than
          // silently deprioritising it.
          return Result.isSuccess(outcomes.severity) ? priorityOf(ticket, outcomes.severity.success) : "high"
        },
        Effect.provide(clef),
        Effect.mapError(TicketTriageError.fromAiError)
      )

      return TicketTriager.of({ route, backlogPriority })
    })
  ).pipe(
    // `CloudflareClient.layerConfig` reads `CLOUDFLARE_ACCOUNT_ID`,
    // `CLOUDFLARE_API_TOKEN`, and the optional `CLOUDFLARE_AI_GATEWAY_ID`.
    Layer.provide(CloudflareClient.layerConfig()),
    Layer.provide(FetchHttpClient.layer)
  )
}
