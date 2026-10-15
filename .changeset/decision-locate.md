---
"effect": minor
"@effect/ai-cloudflare": patch
"@effect/ai-openai": patch
"@effect/ai-typesafe": minor
---

Declare decision images as input fields with `Decision.Image`, and add `Decision.locate`, which answers with a bounding box around one target in an image field.

- `DecideOptions.images` is removed. Add `Decision.Image` fields to the input schema and refer to each image by its path in instructions:

  ```ts
  // Before
  DecisionModel.decide(Triage, { input: "Checkout error", images: [screenshot] })
  // After
  const Triage = Decision.make({
    input: Schema.Struct({ report: Schema.String, screenshot: Decision.Image }),
    decisions
  })
  DecisionModel.decide(Triage, { input: { report: "Checkout error", screenshot } })
  ```

- Custom providers receive `images` as `{ reference, path, image }`, with each image replaced by its reference in `state` and its data as a base64 string or `URL`.
- `Decision.locate({ image: "photo", instructions })` takes a path that `Decision.make` checks against the input's image fields. Providers opt in with `supportsLocate: true`. `Decision.Any` and `DecisionModel.ProviderAnswer` gain locate variants, so exhaustive switches over them need a `Locate` case.
- `TypeSafeDecisionModel` supports images, sent as assets keyed by reference, and sends locate decisions as Box questions, which need `jev-preview` or `jev-1.14.0`. OpenAI and Cloudflare label each image with its reference.
