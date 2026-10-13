# @effect/ai-cloudflare

Cloudflare Workers AI provider for Effect's `DecisionModel`. Supports text and JSON classification, ordered ratings, and probabilities with Clef and Clef-flash over REST.

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

Pass `images` to decide about pictures alongside the input. Clef shows them to the model before the state:

```ts
declare const screenshotBytes: Uint8Array

const withScreenshot = DecisionModel.decide(Triage, {
  input: "Customers report this checkout error.",
  images: [{ mediaType: "image/png", data: screenshotBytes }]
})
```

Image `data` may be a `Uint8Array`, a base64 string, or a `data:` URL. Remote URLs fail with `AiError.InvalidUserInputError` because Clef does not fetch them; download the image first. Clef accepts up to 4 PNG, JPEG, or WebP images of at most 4 MiB and 16 megapixels each, 8 MiB of decoded images in total, and a 13 MiB request body. These limits are enforced by the API.

Use `"clef"` for the larger model. `CloudflareDecisionModel.model` provides a model descriptor with Cloudflare provider metadata. `CloudflareClient.layer` accepts an explicit account ID and redacted API token; `apiUrl` and `transformClient` customize HTTP access.

The client unwraps Cloudflare's REST envelope and maps failures to `AiError`. It does not retry automatically. Rate-limit errors include `Retry-After` when provided. The decision model validates answers and rescales small probability drift from four-decimal rounding.

Cloudflare limits each request to 64 questions, classification to 2–255 choices, and ratings to 2–10 levels. See the [Clef API documentation](https://developers.cloudflare.com/workers-ai/models/clef/) for request limits.
