import * as FeatureFlag from "@effect/openfeature/FeatureFlag"
import * as NodeSdk from "@effect/openfeature/NodeSdk"
import * as WebSdk from "@effect/openfeature/WebSdk"
import { OpenFeature as NodeOpenFeature } from "@openfeature/server-sdk"
import { OpenFeature as BrowserOpenFeature } from "@openfeature/web-sdk"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { expect, it } from "tstyche"

it("adapts both official SDK client types", () => {
  const nodeLayer = NodeSdk.layer({ client: NodeOpenFeature.getClient("checkout") })
  const webLayer = WebSdk.layer({ client: BrowserOpenFeature.getClient("checkout") })

  expect(nodeLayer).type.toBe<Layer.Layer<FeatureFlag.FeatureFlag>>()
  expect(webLayer).type.toBe<Layer.Layer<FeatureFlag.FeatureFlag>>()
})

it("infers flag result types from schemas in the application catalog", () => {
  const flags = FeatureFlag.define({
    enabled: FeatureFlag.flag({
      key: "checkout.enabled",
      schema: Schema.Boolean,
      defaultValue: false
    }),
    variant: FeatureFlag.flag({
      key: "checkout.variant",
      schema: Schema.Literals(["control", "treatment"]),
      defaultValue: "control"
    }),
    settings: FeatureFlag.flag({
      key: "checkout.settings",
      schema: Schema.Struct({ enabled: Schema.Boolean }),
      defaultValue: { enabled: false }
    }),
    limit: FeatureFlag.flag({
      key: "checkout.limit",
      schema: Schema.NumberFromString,
      defaultValue: "10"
    }),
    regions: FeatureFlag.flag({
      key: "checkout.regions",
      schema: Schema.Array(Schema.String),
      defaultValue: ["us"]
    }),
    preferences: FeatureFlag.flag({
      key: "checkout.preferences",
      schema: Schema.Struct({ regions: Schema.Array(Schema.String) }),
      defaultValue: { regions: ["us"] }
    }),
    nullableSettings: FeatureFlag.flag({
      key: "checkout.settings-optional",
      schema: Schema.NullOr(Schema.Struct({ enabled: Schema.Boolean })),
      defaultValue: null
    })
  })

  expect(FeatureFlag.value(flags.enabled)).type.toBe<
    Effect.Effect<boolean, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
  expect(FeatureFlag.details(flags.variant)).type.toBe<
    Effect.Effect<
      FeatureFlag.EvaluationDetails<"control" | "treatment">,
      FeatureFlag.FeatureFlagError,
      FeatureFlag.FeatureFlag
    >
  >()
  expect(FeatureFlag.value(flags.settings)).type.toBe<
    Effect.Effect<{ readonly enabled: boolean }, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
  expect(FeatureFlag.value(flags.limit)).type.toBe<
    Effect.Effect<number, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
  expect(FeatureFlag.value(flags.regions)).type.toBe<
    Effect.Effect<ReadonlyArray<string>, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
  expect(FeatureFlag.value(flags.preferences)).type.toBe<
    Effect.Effect<{ readonly regions: ReadonlyArray<string> }, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
  expect(FeatureFlag.value(flags.nullableSettings)).type.toBe<
    Effect.Effect<{ readonly enabled: boolean } | null, FeatureFlag.FeatureFlagError, FeatureFlag.FeatureFlag>
  >()
})

it("requires a flag definition and a default compatible with its schema", () => {
  expect(FeatureFlag.value).type.not.toBeCallableWith("checkout.enabled")
  expect(FeatureFlag.flag).type.not.toBeCallableWith({
    key: "checkout.enabled",
    schema: Schema.Boolean,
    defaultValue: "false"
  })
  expect(FeatureFlag.flag).type.not.toBeCallableWith({
    key: "checkout.plan",
    schema: Schema.NullOr(Schema.String),
    defaultValue: null
  })
  expect(FeatureFlag.flag).type.not.toBeCallableWith({
    key: "checkout.plan",
    schema: Schema.NullOr(Schema.String),
    defaultValue: "free"
  })
  expect(FeatureFlag.flag).type.not.toBeCallableWith({
    key: "checkout.choice",
    schema: Schema.Union([Schema.Boolean, Schema.Number]),
    defaultValue: false
  })
  expect(FeatureFlag.value).type.not.toBeCallableWith({
    key: "checkout.plan",
    schema: Schema.NullOr(Schema.String),
    defaultValue: null
  })
})
