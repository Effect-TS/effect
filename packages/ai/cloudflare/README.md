# @effect/ai-cloudflare

Cloudflare Workers AI provider for Effect's `DecisionModel` and `ExtractionModel`. Supports text and JSON classification, ordered ratings, and probabilities with Clef and Clef-flash, and typed extraction, estimates, and forecasts with Clairic, over REST.

## Installation

```sh
npm install effect @effect/ai-cloudflare
```

## Usage

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, then provide a Cloudflare decision model:

```ts
import { CloudflareClient, CloudflareDecisionModel } from "@effect/ai-cloudflare"
import { Effect, Layer, Schema } from "effect"
import { Decision, DecisionModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

const Triage = Decision.make({
  input: Schema.String,
  decisions: {
    urgent: Decision.probability({
      instructions: "Does this request need immediate attention?"
    })
  }
})

const Clef = CloudflareDecisionModel.layer({ model: "clef-flash" }).pipe(
  Layer.provide(CloudflareClient.layerConfig()),
  Layer.provide(FetchHttpClient.layer)
)

const program = DecisionModel.decide(Triage, {
  input: "Checkout has been failing for every customer for an hour."
}).pipe(Effect.provide(Clef))
```

Pass `images` to include pictures with the input. Clef shows them to the model before the state:

```ts
declare const screenshotBytes: Uint8Array

const withScreenshot = DecisionModel.decide(Triage, {
  input: "Customers report this checkout error.",
  images: [{ mediaType: "image/png", data: screenshotBytes }]
})
```

Image `data` may be a `Uint8Array`, a base64 string, or a `data:` URL. Remote URLs fail with `AiError.InvalidUserInputError` because Clef does not fetch them, so download the image first. The API accepts up to 4 PNG, JPEG, or WebP images, each at most 4 MiB and 16 megapixels, with 8 MiB of decoded images in total and a 13 MiB request body.

Use `"clef"` for the larger model. `CloudflareDecisionModel.model` provides a model descriptor with Cloudflare provider metadata. `CloudflareClient.layer` accepts an explicit account ID and redacted API token; `apiUrl` and `transformClient` customize HTTP access.

Instructions and descriptions can be strings, JSON objects, or JSON arrays. A rating level with a structured description takes an explicit `label`, which answers use.

The client unwraps Cloudflare's REST envelope and maps failures to `AiError`. It does not retry automatically. Rate-limit errors include `Retry-After` when provided. The decision model validates answers and rescales small probability drift from four-decimal rounding.

Cloudflare limits each request to 64 questions, classification to 2–255 choices, and ratings to 2–10 levels. See the [Clef API documentation](https://developers.cloudflare.com/workers-ai/models/clef/) for request limits.

## Extraction with Clairic

`CloudflareExtractionModel` answers typed fields about a text with [Clairic](https://developers.cloudflare.com/workers-ai/models/clairic/):

```ts
import { CloudflareClient, CloudflareExtractionModel } from "@effect/ai-cloudflare"
import { Effect, Layer } from "effect"
import { Extraction, ExtractionModel } from "effect/ai"
import { FetchHttpClient } from "effect/http"

const Invoice = Extraction.make({
  fields: {
    invoice_number: Extraction.text(),
    total: Extraction.number({ decimals: 2, unit: "USD", instructions: "Amount due including shipping" }),
    po_number: Extraction.text({ instructions: "Purchase order number" }),
    days_to_pay: Extraction.estimate({ min: 0, max: 120, step: 1, instructions: "Days after issue until paid" })
  }
})

const Clairic = CloudflareExtractionModel.layer({ model: "clairic" }).pipe(
  Layer.provide(CloudflareClient.layerConfig()),
  Layer.provide(FetchHttpClient.layer)
)

const program = Effect.gen(function*() {
  const { answers } = yield* ExtractionModel.extract(Invoice, {
    text:
      "Invoice INV-2291 from Northwind Supply, issued 2026-09-02, net 30. 4 pallets at $250.00 each, shipping $80.00."
  })
  // answers.po_number is Absent: the invoice has no PO number
  // answers.days_to_pay has a median and an 80% interval (p10 to p90)
  return answers
}).pipe(Effect.provide(Clairic))
```

Field names must match `^[A-Za-z_][A-Za-z0-9_.-]{0,63}$`. Clairic drops time zones from date-time answers, even when the text states one. Images follow the same rules as Clef, with a 16 MiB request body limit.

## AI Gateway

Set `CLOUDFLARE_AI_GATEWAY_ID` when using `CloudflareClient.layerConfig()` to route requests through a Cloudflare AI Gateway. You can also pass `gatewayId` to `CloudflareClient.layer`. The client adds the `cf-aig-gateway-id` header. Use `transformClient` to add other `cf-aig-*` headers.
