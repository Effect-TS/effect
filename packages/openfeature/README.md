# @effect/openfeature

An Effect adapter for [OpenFeature](https://openfeature.dev/) JavaScript SDK clients. Define flags in a shared catalog with Effect `Schema` to type-check references and decode provider values at runtime. Use the Node SDK for per-evaluation context or the Web SDK for browser evaluation with its static context model.

## Installation

```sh
npm install effect@rc @effect/openfeature@rc @openfeature/server-sdk
```

For browser applications, install `@openfeature/web-sdk` instead of the server SDK. Configure providers and their lifecycle using the OpenFeature SDK, then provide the resulting client through `NodeSdk.layer` or `WebSdk.layer`.

## Example

```ts
import * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as NodeSdk from "@effect/openfeature/NodeSdk"
import { OpenFeature } from "@openfeature/server-sdk"
import { Effect, Schema } from "effect"

const Flags = FeatureFlag.define({
  newFlow: FeatureFlag.flag({
    key: "checkout.new-flow",
    schema: Schema.Boolean,
    defaultValue: false
  }),
  variant: FeatureFlag.flag({
    key: "checkout.variant",
    schema: Schema.Literals(["control", "treatment"]),
    defaultValue: "control"
  })
})

const FeatureFlags = NodeSdk.layer({ client: OpenFeature.getClient("checkout") })

const program = Effect.gen(function*() {
  const enabled = yield* FeatureFlag.value(Flags.newFlow)
  const variant = yield* FeatureFlag.value(Flags.variant)
  yield* Effect.log(`new checkout flow enabled: ${enabled}`)
  yield* Effect.log(`checkout variant: ${variant}`)
}).pipe(
  NodeSdk.withEvaluationContext({ targetingKey: "user-123", plan: "pro" }),
  Effect.provide(FeatureFlags)
)

Effect.runPromise(program)
```

Evaluations accept flag definitions rather than arbitrary keys, so application code can only reference catalog entries. The schema constrains the default's encoded type and validates/decodes each provider result before it reaches the program. For transforming schemas, provide the default in the schema's encoded form.

Each flag's encoded schema must use a single OpenFeature evaluation type (boolean, string, number, or object). Object flags can contain arrays and nullable objects; nullable primitive schemas such as `string | null` are not supported because one SDK evaluation method cannot resolve both types.

## Documentation

- [OpenFeature concepts](https://openfeature.dev/docs/reference/intro)
- [Effect API reference](https://effect.website/docs/v4/api/openfeature)
