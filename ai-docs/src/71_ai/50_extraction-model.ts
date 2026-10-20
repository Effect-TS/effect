/**
 * @title Extracting typed fields with ExtractionModel
 *
 * Define the fields to read, compute, or estimate from a document with
 * `Extraction.make`, then answer them with `ExtractionModel.extract`. Each
 * answer is decoded by its field's schema and carries a confidence or a
 * distribution.
 */
import { CloudflareClient, CloudflareExtractionModel } from "@effect/ai-cloudflare"
import { Context, DateTime, Duration, Effect, Layer, Option, Schema } from "effect"
import { AiError, Extraction, ExtractionModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"
import { type InboundInvoice, type InvoiceIntakeResult, PayableInvoice } from "./fixtures/domain/Invoice.ts"

// ---------------------------------------------------------------------------
// 1. Defining fields
// ---------------------------------------------------------------------------

// An extraction definition names the fields to answer from one text. All
// fields are answered in one provider call. Field names become the keys of
// `answers`; Cloudflare requires them to match `^[A-Za-z_][A-Za-z0-9_.-]{0,63}$`.
const InvoiceFields = Extraction.make({
  fields: {
    // Single-value fields (text, number, date, time, dateTime, duration)
    // answer `Found` or `Absent`. `instructions` tell the model what the field
    // means when the name alone is ambiguous.
    invoiceNumber: Extraction.text({ instructions: "The vendor's invoice number, not the PO number" }),
    vendor: Extraction.text({ instructions: "Legal name of the company issuing the invoice" }),
    // Numbers can be read or computed. `decimals` and `unit` shape the answer.
    total: Extraction.number({
      instructions: "Amount due including tax and shipping",
      unit: "USD",
      decimals: 2
    }),
    poNumber: Extraction.text({ instructions: "Our purchase order number, if quoted" }),
    // Dates are answered as ISO `YYYY-MM-DD` strings, not `DateTime`. A
    // calendar date has no time zone, and decoding it as a UTC instant would
    // show the previous day in zones behind UTC.
    issueDate: Extraction.date(),
    dueDate: Extraction.date({ instructions: "Payment due date; compute it from the terms if not stated" }),
    // Durations are unambiguous, so they decode to `Duration`. The provider
    // answers in `unit`, here days, which supports "net 30" style terms.
    paymentTerms: Extraction.duration({ unit: "days", integer: true }),
    // `dateTime` answers are ISO strings too. Clairic drops the time zone even
    // when the text states one ("5pm Pacific" comes back as
    // "...T17:00:00"), so ask for the zone in its own field when you need an
    // instant.
    earlyPaymentDeadline: Extraction.dateTime({
      instructions: "Deadline to pay and receive the early-payment discount"
    }),
    earlyPaymentTimeZone: Extraction.text({
      instructions: "IANA time zone of the early-payment deadline, e.g. America/Los_Angeles"
    }),
    // Lists always answer, with an empty `items` array when nothing matches.
    lineItems: Extraction.list({ items: "text", instructions: "Description of each billed line item" }),
    // Estimates answer something the text gives evidence for but does not
    // state, as a distribution inside `[min, max]`.
    daysToPay: Extraction.estimate({
      instructions: "Days after the issue date until we actually pay, judging by terms, amount, and any disputes",
      min: 0,
      max: 120,
      step: 1
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Wrapping extraction in a service
// ---------------------------------------------------------------------------

export class InvoiceIntakeError extends Schema.TaggedError<InvoiceIntakeError>()("InvoiceIntakeError", {
  reason: Schema.Union([
    AiError.AiErrorReason,
    // The document does not determine a field we cannot book without.
    Schema.TaggedStruct("MissingField", { field: Schema.String })
  ])
}) {}

// The library has no confidence threshold option on purpose: what counts as
// "sure enough" depends on what the value is used for. A wrong total costs
// money, so it has a higher bar than a wrong line-item description.
const minConfidence = {
  invoiceNumber: 0.8,
  vendor: 0.8,
  total: 0.95,
  dueDate: 0.8
} as const

export class InvoiceIntake extends Context.Service<InvoiceIntake, {
  read(document: InboundInvoice): Effect.Effect<InvoiceIntakeResult, InvoiceIntakeError>
}>()("acme/InvoiceIntake") {
  static readonly layer = Layer.effect(
    InvoiceIntake,
    Effect.gen(function*() {
      // `CloudflareExtractionModel.model` returns a `Model` for Cloudflare's
      // Clairic extraction model. `captureRequirements` moves the
      // `CloudflareClient` requirement into this Layer's requirements.
      const clairic = yield* CloudflareExtractionModel.model("clairic").captureRequirements

      const read = Effect.fn("InvoiceIntake.read")(
        function*(document: InboundInvoice) {
          const { answers, truncated } = yield* ExtractionModel.extract(InvoiceFields, {
            // Input is plain text. Answer spans are character offsets into
            // this exact string, so `document.text.slice(...span)` recovers
            // the source of a text answer for highlighting in a review UI.
            text: document.text,
            // Anchors dates written without a year, such as "due March 3rd".
            referenceDate: document.receivedOn,
            // Page scans are read before the text. Cloudflare accepts bytes,
            // base64, or `data:` URLs, not remote URLs.
            images: document.pages?.map((page) => ({ mediaType: page.mediaType, data: page.bytes }))
          })

          const reviewReasons: Array<string> = []

          // `truncated` means the provider cut the text short, so answers only
          // reflect the part it read. Treat that as a reason for review rather
          // than an error: what it did read may still be correct.
          if (truncated) reviewReasons.push("document was truncated")

          // -----------------------------------------------------------------
          // Required fields
          // -----------------------------------------------------------------

          // `Absent` is a valid answer, so `extract` never fails because of
          // it. For fields you cannot continue without, `Extraction.toResult`
          // turns the answer into a `Result` that fails with the `Absent`
          // answer, and `Effect.fromResult` lifts it into the error channel.
          // `Absent` carries `field`, which the `catchTag("Absent")` below
          // uses to report what was missing.
          //
          // Note: a `Result` is not yieldable in `Effect.gen`; always go
          // through `Effect.fromResult`.
          const invoiceNumber = yield* Effect.fromResult(Extraction.toResult(answers.invoiceNumber))
          const vendor = yield* Effect.fromResult(Extraction.toResult(answers.vendor))
          const total = yield* Effect.fromResult(Extraction.toResult(answers.total))
          const issueDate = yield* Effect.fromResult(Extraction.toResult(answers.issueDate))

          // `Found` answers are well formed, not necessarily correct. Use
          // `confidence` to route low-certainty values to a person.
          for (const key of ["invoiceNumber", "vendor", "total", "dueDate"] as const) {
            const answer = answers[key]
            if (answer._tag === "Found" && answer.confidence < minConfidence[key]) {
              reviewReasons.push(`low confidence in ${key} (${answer.confidence.toFixed(2)})`)
            }
          }

          // -----------------------------------------------------------------
          // Optional fields
          // -----------------------------------------------------------------

          // Narrow on `_tag` when you need more than the value. An `Absent`
          // answer still carries `pNull` and a `guess`: what the model would
          // have answered. A guess is not a value, so never book it, but it
          // is a useful hint for the reviewer.
          let poNumber: string | undefined
          if (answers.poNumber._tag === "Found") {
            poNumber = answers.poNumber.value
          } else if (answers.poNumber.guess !== undefined && answers.poNumber.pNull < 0.7) {
            reviewReasons.push(`PO number not stated; possibly ${answers.poNumber.guess}`)
          }

          // Use `Extraction.toOption` when only the value matters.
          const dueDate = Option.getOrUndefined(Extraction.toOption(answers.dueDate))
          const paymentTerms = Option.getOrUndefined(Extraction.toOption(answers.paymentTerms))
          if (paymentTerms !== undefined && Duration.isGreaterThan(paymentTerms, Duration.days(60))) {
            reviewReasons.push("payment terms longer than 60 days")
          }

          // Combine the wall-clock `dateTime` with the zone field to get an
          // instant. `adjustForTimeZone` reads "2026-10-28T17:00:00" as 5pm in
          // that zone instead of 5pm UTC.
          const earlyPaymentDeadline = Option.getOrUndefined(Option.flatMap(
            Option.all([
              Extraction.toOption(answers.earlyPaymentDeadline),
              Extraction.toOption(answers.earlyPaymentTimeZone)
            ]),
            ([local, timeZone]) => DateTime.makeZoned(local, { timeZone, adjustForTimeZone: true })
          ))

          // -----------------------------------------------------------------
          // Lists and estimates
          // -----------------------------------------------------------------

          // List items carry per-item spans (text items) or confidences
          // (number and date items).
          const lineItems = answers.lineItems.items.map((item) => item.value)

          // An estimate is a distribution: `value` is the point estimate,
          // `median` the 50th percentile, and `[p10, p90]` the 80% interval.
          // Plan cash flow on the median and schedule the vendor reminder at
          // p90, when payment is very likely to be late. `pAbove` is the
          // probability the true value is past `max`, when reported.
          const { median, p10, p90, pAbove } = answers.daysToPay
          if (pAbove !== undefined && pAbove > 0.2) {
            reviewReasons.push("payment may take longer than 120 days")
          }

          return {
            invoice: new PayableInvoice({
              invoiceNumber,
              vendor,
              total,
              issueDate,
              dueDate,
              poNumber,
              paymentTerms,
              earlyPaymentDeadline,
              lineItems
            }),
            forecast: { likelyDays: median, optimisticDays: p10, pessimisticDays: p90 },
            reviewReasons
          }
        },
        Effect.provide(clairic),
        Effect.catchTags({
          // A required field was `Absent`.
          Absent: (absent) =>
            Effect.fail(new InvoiceIntakeError({ reason: { _tag: "MissingField", field: absent.field } })),
          // Provider errors, plus `InvalidOutputError` when an answer is
          // missing or fails to decode. Use `ExtractionModel.extractSettled`
          // instead to keep the valid answers when that happens.
          AiError: (error) => Effect.fail(new InvoiceIntakeError({ reason: error.reason }))
        })
      )

      return InvoiceIntake.of({ read })
    })
  ).pipe(
    // `CloudflareClient.layerConfig` reads `CLOUDFLARE_ACCOUNT_ID`,
    // `CLOUDFLARE_API_TOKEN`, and the optional `CLOUDFLARE_AI_GATEWAY_ID`.
    // Pass `Config` values to read other names, e.g.
    // `CloudflareClient.layerConfig({ apiKey: Config.Redacted("CF_AI_TOKEN") })`.
    Layer.provide(CloudflareClient.layerConfig()),
    Layer.provide(FetchHttpClient.layer)
  )
}
