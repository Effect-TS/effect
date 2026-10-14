# @effect/ai-typesafe

TypeSafe System One provider for Effect's `DecisionModel`. Supports classification, ordered ratings, probabilities, images, and locating things in images through Effect `HttpClient`.

## Installation

```sh
npm install effect @effect/ai-typesafe
```

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/ai-typesafe): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.

## Usage

Use `TypeSafeClient.layerConfig()` to read `TYPESAFE_API_KEY`, then provide `TypeSafeDecisionModel.model("jev-latest")` to a decision workflow. Versioned model identifiers such as `jev-1.14.0` are also supported.

Instructions and descriptions can be strings, JSON objects, or JSON arrays, as in TypeSafe's [structured questions](https://docs.typesafe.ai/primitives/advanced). A rating level with a structured description takes an explicit label, which answers use:

```ts
import { Decision } from "effect/ai"

const severity = Decision.rate({
  instructions: "How severe is the reported issue?",
  criteria: [
    { label: "cosmetic", description: { what: "No impact to functionality", examples: ["typo in a label"] } },
    { label: "degraded", description: { what: "Broken, but a workaround exists", examples: ["fails in one browser"] } },
    { label: "blocking", description: { what: "No workaround exists", examples: ["cannot log in"] } }
  ]
})
```

### Images

Pass `images` to include pictures with the input. TypeSafe's [image support](https://docs.typesafe.ai/images) is a preview, and the provider sends the `TypeSafe-Danger-Zone-Images: true` header for you. With images, the state becomes `{ input, images }`: the encoded input, and the images in order. Instructions can name an image by path, such as `` `images[0]` ``.

`Decision.locate` asks where something is, as a TypeSafe [Box](https://docs.typesafe.ai/primitives/box) question. It needs Jev 1.14 (`jev-preview` or `jev-1.14.0`). The answer is a bounding box whose edges are fractions of the image's width and height. A box comes back even when the target is absent, so ask whether it is there too:

```ts
import { Schema } from "effect"
import { Decision, DecisionModel } from "effect/ai"

const FindMug = Decision.make({
  input: Schema.String,
  decisions: {
    present: Decision.probability({ instructions: "`images[0]` shows a coffee mug" }),
    mug: Decision.locate({ instructions: "the coffee mug in `images[0]`" })
  }
})

const program = DecisionModel.decide(FindMug, {
  input: "Kitchen counter, morning",
  images: [{ mediaType: "image/jpeg", data: photoBytes }]
})
// answers.mug.box: { left: 0.44, top: 0.25, right: 0.84, bottom: 0.82 }
```

To define options by example pictures, pass the examples as images too and refer to them by path. Each image is sent once, however many questions use it:

```ts
const Gesture = Decision.make({
  input: Schema.String,
  decisions: {
    gesture: Decision.classify({
      instructions: "Which gesture is the hand in `images[0]` making?",
      criteria: {
        thumbs_up: "The gesture in `images[1]`",
        open_palm: "The gesture in `images[2]`",
        none: "No hand, or a gesture unlike the examples"
      }
    })
  }
})

DecisionModel.decide(Gesture, { input: "Camera frame", images: [frame, thumbsUpExample, openPalmExample] })
```

Image `data` may be a `Uint8Array`, a base64 string, or a base64 `data:` URL. Images must be PNG or JPEG, 256 to 1568 pixels on each side; TypeSafe rejects other sizes rather than resizing and ignores EXIF orientation. Remote URLs fail with `AiError.InvalidUserInputError` because TypeSafe does not fetch them.

The client does not retry automatically. Rate-limit errors include the provider's retry delay when available. Provider distributions are preserved, not normalized; they must satisfy the core `DecisionModel` validation, including its current `1e-6` sum tolerance. TypeSafe's rounding behavior has not been verified against the live API.
